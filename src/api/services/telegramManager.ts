import fs from 'fs';
import { Telegraf, Context } from 'telegraf';
import { Server } from 'socket.io';
import axios from 'axios';
import { TelegramSession, Conversation, Contact } from '../models';
import { identityService } from './identityService';
import { conversationService } from './conversationService';
import { aiGateway } from './aiGateway';
import { redisService } from './redisService';
import pino from 'pino';

const logger = pino({ name: 'TelegramAdapter', level: 'info' });

/**
 * Safely escapes characters for Telegram MarkdownV2.
 */
function escapeTelegramMarkdown(text: string): string {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

class TelegramManager {
  private io?: Server;
  private bots = new Map<string, Telegraf<Context>>();
  private isRecovering = false;

  public init(io: Server) {
    this.io = io;
    setTimeout(() => {
      this.recoverActiveBots();
      this.listenForAIResponses();
    }, 5000);

    // Periodically recover bots that are connected in DB but not in memory
    setInterval(() => {
      this.recoverMissingBots();
    }, 60000); // Check every minute
  }

  private async listenForAIResponses() {
    const sub = redisService.subClient;
    sub.on('message', async (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        if (channel === 'ai.response' && data.source === 'telegram') {
          await this.handleAIResponse(data);
        } else if (channel === 'ai.failed' && data.source === 'telegram') {
          await this.handleAIFailure(data);
        }
      } catch (e) {
        logger.error('[Telegram Manager] Failed to parse Redis message');
      }
    });
    
    await sub.subscribe('ai.response').catch(err => logger.error('[Telegram Manager] Redis sub failed (ai.response)'));
    await sub.subscribe('ai.failed').catch(err => logger.error('[Telegram Manager] Redis sub failed (ai.failed)'));
  }

  private async handleAIFailure(data: any) {
    const { clientId, chatId, error } = data;
    logger.warn({ clientId, chatId, error }, 'AI Request Failed for Telegram user');
    
    try {
      const bot = this.bots.get(clientId);
      if (bot) {
        await bot.telegram.sendMessage(chatId, "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.");
      }
    } catch (err) {
      logger.error({ clientId, chatId, err }, 'Failed to send AI failure message');
    }
  }

  private async handleAIResponse(data: any) {
    const { clientId, chatId, response } = data;
    if (!response) return;

    try {
      const bot = this.bots.get(clientId);
      if (bot) {
        try {
          const safeText = escapeTelegramMarkdown(response);
          await bot.telegram.sendMessage(chatId, safeText, { parse_mode: 'MarkdownV2' });
        } catch (sendErr: any) {
          logger.warn({ clientId, chatId, err: sendErr.message }, 'Failed to send Telegram MarkdownV2, retrying with plain text');
          try {
            // Try sending without parse_mode (plain text)
            await bot.telegram.sendMessage(chatId, response);
          } catch (plainErr: any) {
            logger.error({ clientId, chatId, err: plainErr.message }, 'Failed to send plain text Telegram response');
          }
        }
        await this.logMessage(clientId, chatId, 'assistant', response);
      }
    } catch (err) {
      logger.error({ clientId, chatId, err }, 'Failed to send AI response');
    }
  }

  private async recoverActiveBots() {
    if (this.isRecovering) return;
    this.isRecovering = true;
    logger.info('Recovering active Telegram bots');

    try {
      const activeSessions = await TelegramSession.find({ status: 'connected' });
      for (const session of activeSessions) {
        await this.connectTenant(session.tenantId).catch(err => 
          logger.error({ tenantId: session.tenantId, err }, 'Failed to recover bot')
        );
      }
    } catch (err) {
      logger.error({ err }, 'Recovery failed');
    } finally {
      this.isRecovering = false;
    }
  }

  private async recoverMissingBots() {
    if (this.isRecovering) return;
    try {
      const activeSessions = await TelegramSession.find({ status: 'connected' });
      for (const session of activeSessions) {
        if (!this.bots.has(session.tenantId)) {
          logger.info({ tenantId: session.tenantId }, 'Recovering missing connected Telegram bot');
          await this.connectTenant(session.tenantId).catch(err => 
            logger.error({ tenantId: session.tenantId, err }, 'Failed to recover missing bot')
          );
        }
      }
    } catch (err) {
      logger.error({ err }, 'Missing bots recovery failed');
    }
  }

  public async validateBotToken(token: string) {
    try {
      const bot = new Telegraf(token);
      const me = await bot.telegram.getMe();
      return {
        success: true,
        botId: me.id.toString(),
        botUsername: me.username,
        displayName: me.first_name + (me.last_name ? ` ${me.last_name}` : '')
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async connectTenant(tenantId: string): Promise<void> {
    const session = await TelegramSession.findOne({ tenantId });
    if (!session || !session.botToken) throw new Error(`No session for ${tenantId}`);

    if (this.bots.has(tenantId)) {
      await this.disconnectTenant(tenantId).catch(() => {});
    }

    const bot = new Telegraf(session.botToken);
    this.setupBotHandlers(tenantId, bot);
    
    await bot.telegram.deleteWebhook().catch(err => logger.warn({ tenantId, err }, 'Failed to delete webhook before launch'));

    bot.launch({ dropPendingUpdates: true }).catch(err => {
      const isConflict = err.code === 409 || 
                         err.response?.error_code === 409 || 
                         (err.message && (err.message.includes('409') || err.message.includes('Conflict')));
      if (isConflict) {
        logger.warn({ tenantId, err: err.message }, 'Telegram bot conflict detected (409) during launch. Keeping connected status in DB and suspending local loop.');
        this.handleConflict(tenantId).catch(() => {});
      } else {
        logger.error({ tenantId, err }, 'Bot launch failed');
        this.emitStatusUpdate(tenantId, 'error', { error: err.message });
      }
    });

    this.bots.set(tenantId, bot);
    await TelegramSession.updateOne({ tenantId }, { status: 'connected', lastConnectedAt: new Date() });
    this.emitStatusUpdate(tenantId, 'connected');
    logger.info({ tenantId }, 'Telegram bot connected');
  }

  private setupBotHandlers(tenantId: string, bot: Telegraf<Context>) {
    bot.use(async (ctx: any, next) => {
      const tgUser = ctx.from;
      if (!tgUser) return next();

      const tgUserId = tgUser.id.toString();

      try {
        let username = tgUser.username || '';
        if (username && !username.startsWith('@')) {
          username = '@' + username;
        }

        const contact = await identityService.resolveContact(tenantId, {
          telegramUserId: tgUserId,
          telegramUsername: username,
          name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
        }, 'telegram');

        if (!contact) return next();

        if (ctx.chat) {
          await identityService.syncTelegramIdentity(tenantId, contact._id, {
            ...tgUser,
            chat_id: ctx.chat.id.toString(),
          });
        }

        ctx.state.contact = contact;
        ctx.state.tenantId = tenantId;
      } catch (err) {
        logger.error({ tenantId, tgUserId, err }, 'Failed to resolve identity');
      }

      return next();
    });

    bot.start(async (ctx: any) => {
      const { contact, tenantId } = ctx.state;
      const chatId = ctx.chat.id.toString();
      const userId = ctx.from.id.toString();
      
      await aiGateway.requestAI({
        clientId: tenantId,
        userId,
        chatId,
        source: 'telegram',
        message: '/start',
        metadata: { userName: contact.name }
      });
    });

    bot.on('text', async (ctx: any) => {
      const { contact, tenantId } = ctx.state;
      let text = ctx.message.text;
      if (ctx.message.reply_to_message) {
        const repliedText = ctx.message.reply_to_message.text || '[Media/Non-text]';
        const repliedUser = ctx.message.reply_to_message.from?.first_name || 'Agent';
        text = `[Replying to ${repliedUser}'s message: "${repliedText}"]\n${text}`;
      }
      const chatId = ctx.chat.id.toString();
      const userId = ctx.from.id.toString();

      await conversationService.handleInbound(tenantId, 'telegram', chatId, { text });

      try {
        const session = await TelegramSession.findOne({ tenantId });
        if (session?.paused) return;

        const conv = await Conversation.findOne({ clientId: tenantId, customerJid: chatId });
        if (conv && conv.aiEnabled === false) return;

        await aiGateway.requestAI({
          clientId: tenantId,
          userId,
          chatId,
          source: 'telegram',
          message: text,
          metadata: { userName: contact.name }
        });
      } catch (err) {
        logger.error({ tenantId, chatId, userId, err }, 'Failed to queue AI request');
      }
    });

bot.on('photo', async (ctx: any) => {
      const { tenantId } = ctx.state;
      const chatId = ctx.chat.id.toString();
      const userId = ctx.from.id.toString();
      let text = ctx.message.caption || '';
      let imageUrl;

      try {
        const photo = ctx.message.photo.pop();
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const { default: axios } = await import('axios');
        const mediaRes = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
        const buffer = Buffer.from(mediaRes.data);
        const path = await import('path');
        const publicPath = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
        const safeName = `${Date.now()}-tg-image.jpg`;
        const filePath = path.join(publicPath, safeName);
        fs.writeFileSync(filePath, buffer);
        imageUrl = `/uploads/${safeName}`;
      } catch (err) {
        logger.error({ err }, 'Failed to download telegram photo');
        text = text ? text + ' [Photo download failed]' : '[Photo download failed]';
      }

      await conversationService.handleInbound(tenantId, 'telegram', chatId, { text, imageUrl });

      try {
        const session = await TelegramSession.findOne({ tenantId });
        if (session?.paused) return;

        const conv = await Conversation.findOne({ clientId: tenantId, customerJid: chatId });
        if (conv && conv.aiEnabled === false) return;

        const contact = await Contact.findOne({ clientId: tenantId, platform: 'telegram', platformId: userId }) || { name: 'User' };

        await aiGateway.requestAI({
          clientId: tenantId,
          userId,
          chatId,
          source: 'telegram',
          message: text || '[Photo uploaded]',
          imageUrl,
          metadata: { userName: contact.name }
        });
      } catch (err) {
        logger.error({ tenantId, chatId, userId, err }, 'Failed to queue AI request for photo');
      }
    });

    bot.catch((err: any) => {
      const isConflict = err.code === 409 || 
                         err.response?.error_code === 409 || 
                         (err.message && err.message.includes('409')) || 
                         (err.message && err.message.includes('Conflict'));

      if (isConflict) {
        logger.warn({ tenantId, err: err.message }, 'Telegram bot conflict detected (409). Suspending local loop to let other instance run.');
        this.handleConflict(tenantId).catch(() => {});
      } else {
        logger.error({ tenantId, err }, 'Telegraf error');
      }
    });
  }

  private async logMessage(clientId: string, customerJid: string, sender: 'customer' | 'assistant', text: string) {
    let conv = await Conversation.findOne({ clientId, customerJid });
    if (!conv) conv = new Conversation({ clientId, customerJid, platform: 'telegram', messages: [] });
    conv.messages.push({ sender, text, timestamp: new Date() });
    await conv.save();
    if (this.io) this.io.emit(`telegram_conversation_updated:${clientId}:${customerJid}`, conv);
  }

  public async sendMessage(tenantId: string, chatId: string, payload: any): Promise<void> {
    let bot = this.bots.get(tenantId);
    if (!bot) {
      logger.warn({ tenantId }, 'Bot not found in memory, attempting recovery');
      await this.connectTenant(tenantId).catch(err => logger.error({ tenantId, err }, 'Failed to recover bot in sendMessage'));
      bot = this.bots.get(tenantId);
    }
    
    if (!bot) throw new Error('Bot not connected');
    if (payload.text) {
      try {
        await bot.telegram.sendMessage(chatId, escapeTelegramMarkdown(payload.text), { parse_mode: 'MarkdownV2' });
      } catch (sendErr: any) {
        logger.warn({ tenantId, chatId, err: sendErr.message }, 'Failed to send Telegram MarkdownV2 custom message, retrying with plain text');
        await bot.telegram.sendMessage(chatId, payload.text);
      }
    }
  }

  public async togglePause(tenantId: string, paused: boolean): Promise<void> {
    await TelegramSession.updateOne({ tenantId }, { paused });
  }

  public async restartTenant(tenantId: string): Promise<void> {
    await this.disconnectTenant(tenantId).catch(() => {});
    await this.connectTenant(tenantId);
  }

  public async getSessionStatus(tenantId: string) {
    const session = await TelegramSession.findOne({ tenantId });
    return {
      isConnected: this.bots.has(tenantId),
      status: session?.status || 'disconnected',
      botUsername: session?.botUsername,
      lastConnectedAt: session?.lastConnectedAt
    };
  }

  public async getHealth() {
    return { activeBots: this.bots.size, isRecovering: this.isRecovering };
  }

  public async disconnectTenant(tenantId: string) {
    const bot = this.bots.get(tenantId);
    if (bot) {
      try {
        await bot.stop();
      } catch (e) {}
      this.bots.delete(tenantId);
    }
    await TelegramSession.updateOne({ tenantId }, { status: 'disconnected' });
    this.emitStatusUpdate(tenantId, 'disconnected');
  }

  private async handleConflict(tenantId: string) {
    const bot = this.bots.get(tenantId);
    if (bot) {
      try {
        await bot.stop();
      } catch (e) {}
      this.bots.delete(tenantId);
    }
    this.emitStatusUpdate(tenantId, 'conflict');
  }

  private emitStatusUpdate(tenantId: string, status: string, extra: any = {}) {
    if (this.io) this.io.emit(`telegram_status:${tenantId}`, { status, ...extra });
  }
}

export const telegramManager = new TelegramManager();

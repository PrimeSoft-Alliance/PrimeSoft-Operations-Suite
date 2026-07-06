import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { UnifiedMessage, Settings, Contact, Inquiry, Ticket, TicketMessage } from '../models';
import { sendEmail } from '../email';
import { redisService } from './redisService';
import { EmailConfigService } from './emailConfigService';
import pino from 'pino';

const logger = pino({ name: 'EmailInboxService' });

function isNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('etimeout') ||
    msg.includes('connection not available') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('ehostunreach') ||
    msg.includes('econnrefused') ||
    msg.includes('socket closed') ||
    msg.includes('bad credentials') ||
    msg.includes('login failed') ||
    code === 'etimeout' ||
    code === 'econnreset' ||
    code === 'enotfound' ||
    code === 'ehostunreach' ||
    code === 'econnrefused'
  );
}

export class EmailEngine {
  private instances: Map<string, ImapFlow> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private reconnecting: Set<string> = new Set();

  async startSync(clientId: string) {
    // 🔐 FALLBACK CREDENTIAL SYSTEM (STRICT PRIORITY RULE)
    const { config, source } = await EmailConfigService.getImapConfig(clientId);

    if (!config) {
      logger.info(`[EmailSync] IMAP not configured for ${clientId} (Source: ${source}). Skipping sync.`);
      return;
    }

    if (this.instances.has(clientId)) return;

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.auth.user, pass: config.auth.pass },
      logger: false,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 90000, // Increased to 90 seconds
      greetingTimeout: 90000, // Increased to 90 seconds
    });

    client.on('error', err => {
      if (isNetworkError(err)) {
        logger.warn({ err: err?.message || err }, `[IMAP_FLOW_WARN] ${clientId}: Connection issue - ${err?.message || String(err)}`);
      } else {
        logger.error(err, `[IMAP_FLOW_ERROR] ${clientId}`);
      }
      if (!client.usable) {
        this.reconnect(clientId).catch(() => {});
      }
    });

    try {
      await client.connect();
      this.instances.set(clientId, client);
      this.failureCounts.delete(clientId);
      logger.info(`[EmailSync] IMAP connected for ${clientId}`);
      
      await this.syncInboundEmails(clientId, client);
      
      // Listen for new messages (IDLE)
      client.on('exists', async () => {
        if (!client.usable) return;
        logger.info(`[EmailSync] New email detected for ${clientId} (via IDLE). Triggering sync.`);
        await this.syncInboundEmails(clientId, client).catch(e => logger.error(`[EmailSync] IDLE sync error for ${clientId}: ${e.message}`));
      });

      // Polling fallback every 2 minutes in case IDLE fails or isn't supported
      const pollInterval = setInterval(async () => {
        const currentClient = this.instances.get(clientId);
        if (currentClient === client) {
          if (!client.usable) {
            logger.warn(`[EmailSync] Polling detected unusable IMAP connection for ${clientId}. Reconnecting.`);
            clearInterval(pollInterval);
            await this.reconnect(clientId);
            return;
          }
          logger.debug(`[EmailSync] Polling sync for ${clientId}`);
          await this.syncInboundEmails(clientId, client).catch(e => {
              logger.error(`[EmailSync] Polling error for ${clientId}: ${e.message}`);
              if (e.message.includes('Connection not available') || e.message.includes('timeout')) {
                  this.reconnect(clientId).catch(() => {});
              }
          });
        } else {
          clearInterval(pollInterval);
        }
      }, 120000);

      client.on('close', async () => {
        logger.warn(`[EmailSync] IMAP connection closed for ${clientId}.`);
        await this.reconnect(clientId);
      });

    } catch (err: any) {
      if (isNetworkError(err)) {
        logger.warn(`[EmailSync] IMAP connection issue for ${clientId}: ${err.message}`);
      } else {
        logger.error(`[EmailSync] IMAP connection failed for ${clientId}: ${err.message}`);
      }
      this.instances.delete(clientId);
      
      const count = (this.failureCounts.get(clientId) || 0) + 1;
      this.failureCounts.set(clientId, count);
      
      // Calculate delay with backoff, maxing out at 15 minutes (900000ms)
      const delay = Math.min(Math.pow(2, Math.min(count, 8)) * 1000 + 30000, 900000);
      logger.warn(`[EmailSync] Retrying IMAP sync for ${clientId} in ${delay / 1000} seconds (Attempt ${count})`);
      
      // If we failed too many times (e.g., 15 times), mark status as 'failed'
      if (count >= 15) {
        logger.error(`[EmailSync] Disabling auto-sync for ${clientId} after 15 failed connection attempts.`);
        try {
          await Settings.updateOne({ clientId }, { $set: { inboundSyncStatus: 'failed' } });
        } catch (dbErr) {
          logger.error(`[EmailSync] Failed to update settings status for ${clientId}: ${dbErr}`);
        }
        this.failureCounts.delete(clientId);
        return;
      }

      setTimeout(() => this.startSync(clientId), delay);
    }
  }

  private async reconnect(clientId: string) {
    if (this.reconnecting.has(clientId)) return;
    
    this.reconnecting.add(clientId);
    const activeClient = this.instances.get(clientId);
    if (activeClient) {
      try {
        await activeClient.logout().catch(() => {});
      } catch (e) {}
      this.instances.delete(clientId);
    }
    
    logger.info(`[EmailSync] Scheduling reconnect for ${clientId} in 5s...`);
    setTimeout(() => {
      this.reconnecting.delete(clientId);
      this.startSync(clientId);
    }, 5000);
  }

  async stopSync(clientId: string) {
    const client = this.instances.get(clientId);
    if (client) {
      try {
        await client.logout();
      } catch (e) {}
      this.instances.delete(clientId);
    }
  }

  async syncInboundEmails(clientId: string, clientInstance?: ImapFlow) {
    const settings = await Settings.findOne({ clientId });
    const { config, source } = await EmailConfigService.getImapConfig(clientId);

    let client = clientInstance;
    let manualLogout = false;

    if (!client) {
        if (!config) {
            return { success: false, error: `IMAP not configured (Source: ${source})` };
        }

        client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: { user: config.auth.user, pass: config.auth.pass },
            logger: false,
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 90000,
            greetingTimeout: 90000,
        });
        
        client.on('error', err => {
            logger.error(err, `[IMAP_FLOW_ERROR] ${clientId}`);
        });

        await client.connect();
        manualLogout = true;
    }

    try {
      if (client && !client.usable) {
         throw new Error("Connection not available");
      }
      const lock = await client.getMailboxLock('INBOX');
      try {
        const fetchGen = client.fetch({ seen: false }, { 
          source: true,
          uid: true,
        });

        for await (const msg of fetchGen) {
          const email = await simpleParser(msg.source);
          
          const senderObj = email.from?.value?.[0] || { address: 'unknown@example.com', name: 'Unknown' };
          const senderEmail = senderObj.address || 'unknown@example.com';
          const senderName = senderObj.name || senderEmail.split('@')[0];
          
          const messageId = email.messageId || `imap-${msg.uid}-${Date.now()}`;
          const inReplyTo = email.inReplyTo;
          const references = email.references;

          const existing = await UnifiedMessage.findOne({ 
            clientId, 
            messageId,
            type: 'email'
          });

          if (!existing) {
            let contact = await Contact.findOne({ clientId, email: senderEmail });

            if (!contact) {
              contact = await Contact.create({
                clientId,
                name: senderName,
                email: senderEmail,
                source: 'email'
              });
            }
            
            // Map to existing Tickets or Inquiries based on In-Reply-To or Subject Threading
            let mappedType = 'inquiry';
            let threadId = inReplyTo || (Array.isArray(references) ? references[0] : references) || messageId;
            
            // Check if it belongs to a ticket
            const existingTicket = await Ticket.findOne({
              clientId,
              $or: [
                { threadId },
                { subject: { $regex: new RegExp(email.subject?.replace(/^(re|fwd):\s*/i, '') || '', 'i') } }
              ]
            });
            
            if (existingTicket) {
              mappedType = 'ticket';
              // Add to ticket messages
              await TicketMessage.create({
                clientId,
                ticketId: existingTicket._id,
                senderRole: 'customer',
                senderName,
                content: email.text || email.html || '',
                isInternal: false
              });
              existingTicket.hasUnreadMessages = true;
              await existingTicket.save();
              
              // Notify
              try {
                const { notificationService } = await import('./notificationService');
                await notificationService.sendTicketReopened(clientId, existingTicket);
              } catch (e) {}
            } else {
              // Create or update Inquiry
              const newInquiry = await Inquiry.create({
                clientId,
                threadId,
                customerId: contact._id,
                senderEmail,
                subject: email.subject || 'No Subject',
                body: email.html || email.text || '',
                status: 'unread',
                priority: 'medium'
              });
              
              // Notify
              try {
                const { notificationService } = await import('./notificationService');
                await notificationService.sendNewInquiry(clientId, newInquiry);
              } catch (e) {}
            }

            await UnifiedMessage.create({
              clientId,
              messageId,
              type: 'email',
              direction: 'inbound',
              status: 'received',
              from: senderEmail,
              to: config.auth.user || 'unknown',
              content: email.text || email.html || '',
              metadata: {
                subject: email.subject,
                headers: email.headers,
                attachmentsCount: email.attachments?.length || 0,
                hasHtml: !!email.html,
                mappedType
              }
            });

            // ⚡ REDIS EVENT SYSTEM (MANDATORY)
            await redisService.client.publish('email_events', JSON.stringify({
              event: 'email.received',
              clientId,
              from: senderEmail,
              subject: email.subject,
              messageId,
              timestamp: new Date()
            }));

            await client.messageFlagsAdd(msg.uid.toString(), ['\\Seen'], { uid: true });

            // Trigger AI Gateway processing for the new message
            try {
               const { aiGateway } = await import('./aiGateway');
               await aiGateway.requestAI({
                  clientId,
                  userId: senderEmail,
                  chatId: senderEmail,
                  source: 'widget', // We treat email as a similar flow but with 'email' source
                  message: email.text || '',
                  metadata: {
                    source: 'email',
                    subject: email.subject,
                    from: senderEmail,
                    messageId: messageId,
                    references: email.references || []
                  }
               });
            } catch (aiErr) {
               logger.error({ err: aiErr }, 'AI Gateway queuing failed for email');
            }
          }
        }
      } finally {
        lock.release();
      }

      if (manualLogout) await client.logout();
      return { success: true };
    } catch (err: any) {
      if (isNetworkError(err)) {
        logger.warn(`[EmailSync] Sync issue for ${clientId}: ${err.message}`);
      } else {
        logger.error(`[EmailSync] Sync error for ${clientId}: ${err.message}`);
      }
      if (manualLogout) await client.logout().catch(() => {});
      return { success: false, error: err.message };
    }
  }

  async restartAll() {
    this.listenForAIResponses();
    // 1. System/Global sync (if configured in ENV)
    if (process.env.IMAP_HOST && process.env.IMAP_USER) {
        await this.startSync('system').catch(e => logger.error({ err: e }, '[EmailSync] Global sync start failed'));
    }

    // 2. Client-specific syncs
    const activeClients = await Settings.find({ inboundSyncStatus: 'active' });
    for (const s of activeClients) {
      await this.startSync(s.clientId).catch(() => {});
    }
  }

  private async listenForAIResponses() {
    const sub = redisService.subClient;
    sub.on('message', async (channel: string, message: string) => {
      if (channel === 'ai.response') {
        try {
          const data = JSON.parse(message);
          if (data.metadata?.source === 'email') {
             await this.handleAIResponse(data);
          }
        } catch (e) {
          logger.error('Failed to parse AI response for email');
        }
      }
    });
    await sub.subscribe('ai.response').catch(err => logger.error('Redis sub failed for email engine'));
  }

  private async handleAIResponse(data: any) {
    const { clientId, chatId, response, metadata } = data;
    if (!response) return;

    try {
      const options: any = {};
      if (metadata?.messageId) {
        options.inReplyTo = metadata.messageId;
        const refs = Array.isArray(metadata.references) ? [...metadata.references] : (metadata.references ? [metadata.references] : []);
        refs.push(metadata.messageId);
        options.references = refs;
      }
      
      await this.sendTransactional(clientId, chatId, `Re: ${metadata?.subject || 'OminiRep Response'}`, String(response), undefined, options);
    } catch (err) {
      logger.error({ clientId, chatId, err }, 'Failed to send AI response email');
    }
  }

  async sendTransactional(clientId: string, to: string, subject: string, content: string, html?: string, options?: any, attachments?: any[]) {
    const res = await sendEmail(to, subject, content, html, clientId, undefined, attachments, options);
    return res;
  }
}

export const emailEngine = new EmailEngine();

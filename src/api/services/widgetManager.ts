import { Server, Socket } from 'socket.io';
import pino from 'pino';
import { conversationService } from './conversationService';
import { aiGateway } from './aiGateway';
import { redisService } from './redisService';
import { identityService } from './identityService';
import { Conversation } from '../models';

const logger = pino({ name: 'WidgetManager' });

export class WidgetManager {
  private io!: Server;

  public init(io: Server) {
    this.io = io;
    this.listenForAIResponses();

    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.handshake.query.clientId as string;
      const sessionId = socket.handshake.query.sessionId as string;

      if (!clientId || !sessionId) {
        logger.warn('Widget connection missing clientId or sessionId');
        return;
      }

      logger.info({ clientId, sessionId }, 'Widget connected');
      socket.join(`widget:${clientId}:${sessionId}`);

      socket.on('widget_message', async (payload: any) => {
        try {
          const { text } = payload;
          
          // Resolve Identity for the widget session
          const contact = await identityService.resolveContact(clientId, { widgetSessionId: sessionId }, 'widget');
          
          await aiGateway.requestAI({
            clientId,
            userId: sessionId,
            chatId: sessionId,
            source: 'widget',
            message: text,
            metadata: {
              contactId: contact._id
            }
          });

          // Sync conversation back
          const convs = await Conversation.find({ clientId, platform: 'widget', customerJid: sessionId }).sort({ updatedAt: -1 }).limit(1);
          if (convs.length > 0) {
            this.io.to(`widget:${clientId}:${sessionId}`).emit(`widget_conversation_updated:${clientId}:${sessionId}`, convs[0]);
          }

        } catch (error) {
          logger.error({ err: error }, 'Error handling widget message');
        }
      });
      
      socket.on('disconnect', () => {
        logger.info({ clientId, sessionId }, 'Widget disconnected');
      });
    });
  }
  
  private async listenForAIResponses() {
    const sub = redisService.subClient;
    sub.on('message', async (channel: string, message: string) => {
      if (channel === 'ai.response') {
        try {
          const data = JSON.parse(message);
          if (data.source === 'widget') {
            await this.handleAIResponse(data);
          }
        } catch (e) {
          logger.error('Failed to parse AI response for widget');
        }
      }
    });
    await sub.subscribe('ai.response').catch(err => logger.error('Redis sub failed for widget manager'));
  }

  private async handleAIResponse(data: any) {
    const { clientId, chatId, response } = data;
    if (!response) return;

    try {
      // Sync conversation back to widget
      const convs = await Conversation.find({ clientId, platform: 'widget', customerJid: chatId }).sort({ updatedAt: -1 }).limit(1);
      if (convs.length > 0) {
        this.io.to(`widget:${clientId}:${chatId}`).emit(`widget_conversation_updated:${clientId}:${chatId}`, convs[0]);
      }
    } catch (err) {
      logger.error({ clientId, chatId, err }, 'Failed to broadcast AI response to widget');
    }
  }
  public emitToWidget(clientId: string, sessionId: string, event: string, payload: any) {
    if (this.io) {
      this.io.to(`widget:${clientId}:${sessionId}`).emit(event, payload);
    }
  }

  public async broadcastConversationUpdate(clientId: string, customerJid: string) {
    if (this.io) {
       const convs = await Conversation.find({ clientId, platform: 'widget', customerJid }).sort({ updatedAt: -1 }).limit(1);
       if (convs.length > 0) {
         this.io.emit(`widget_conversation_updated:${clientId}:${customerJid}`, convs[0]);
       }
    }
  }
}

export const widgetManager = new WidgetManager();

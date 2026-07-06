import { v4 as uuidv4 } from 'uuid';
import { redisService } from './redisService';
import pino from 'pino';

const logger = pino({ name: 'AIGateway' });

export interface AIRequest {
  requestId: string;
  source: 'telegram' | 'whatsapp' | 'widget' | 'telnyx';
  clientId: string;
  userId: string;
  chatId: string;
  message: string;
  imageUrl?: string;
  timestamp: Date;
  context?: {
    previousMessages: any[];
    sessionId: string;
  };
  metadata?: any;
}

export class AIGateway {
  public async requestAI(params: Omit<AIRequest, 'requestId' | 'timestamp'>) {
    const requestId = uuidv4();
    const timestamp = new Date();
    
    const request: AIRequest = {
      ...params,
      requestId,
      timestamp
    };

    logger.info({ requestId, source: request.source, clientId: request.clientId }, 'Pushing AI request to Redis');

    try {
      await redisService.client.publish('ai.request', JSON.stringify(request));
      return requestId;
    } catch (err) {
      logger.error({ err, requestId }, 'Failed to publish AI request to Redis');
      throw err;
    }
  }
}

export const aiGateway = new AIGateway();

import { redisService } from './redisService';
import { aiOrchestrator } from './aiOrchestrator';
import { AILog } from '../models';
import pino from 'pino';

const logger = pino({ name: 'AIWorker' });

export class AIWorker {
  public async start() {
    logger.info('AI Worker starting and subscribing to ai.request channel...');
    
    try {
      const sub = redisService.subClient;
      if (typeof sub.subscribe === 'function') {
        await sub.subscribe('ai.request');
        logger.info('AI Worker successfully subscribed to ai.request');
      } else {
        logger.warn('AI Worker: subClient.subscribe is not available (mock mode?)');
      }

      sub.on('message', async (channel: string, message: string) => {
        if (channel === 'ai.request') {
          await this.handleRequest(message);
        }
      });
    } catch (err) {
      logger.error({ err }, 'AI Worker subscription failed');
      throw err;
    }
  }

  private async handleRequest(rawMessage: string) {
    let request;
    try {
      request = JSON.parse(rawMessage);
    } catch (e) {
      logger.error('Failed to parse AI request message');
      return;
    }

    const { requestId, clientId, sessionId, message, imageUrl, platform, source } = request;
    logger.info({ requestId, clientId, source, message: message?.substring(0, 50) }, 'Processing AI request');

    try {
      // 1. Process with existing AI Orchestrator
      logger.debug({ requestId }, 'Calling AI Orchestrator...');
      const aiResult = await aiOrchestrator.processMessage({
        clientId,
        sessionId: sessionId || (platform === 'telegram' ? request.userId : request.chatId),
        platform: platform || source,
        message,
        imageUrl,
        userId: request.userId,
        chatId: request.chatId
      });

      if (aiResult === null) {
        logger.info({ requestId }, 'AI is disabled for this conversation or contact. Skipping response.');
        return;
      }

      const response = aiResult.response;
      const responseImageUrl = aiResult.imageUrl;

      logger.info({ requestId, responseLength: response?.length }, 'AI Orchestrator returned response');

      const actualSessionId = sessionId || (platform === 'telegram' ? request.userId : request.chatId);

      // Log AI Usage to DB for metrics
      await Promise.all([
        AILog.create({ clientId, sessionId: actualSessionId, role: 'user', content: message || '[Media/Image]' }),
        AILog.create({ clientId, sessionId: actualSessionId, role: 'model', content: response || '[No response]' })
      ]).catch(err => logger.error({ err }, 'Failed to log AI usage to AILog'));

      // 2. Publish Response
      const aiResponse = {
        requestId,
        source,
        clientId,
        userId: request.userId,
        chatId: request.chatId,
        response,
        imageUrl: responseImageUrl,
        timestamp: new Date()
      };

      await redisService.client.publish('ai.response', JSON.stringify(aiResponse));
      logger.info({ requestId }, 'AI response published to Redis');

    } catch (err: any) {
      logger.error({ err, requestId }, 'AI processing failed');
      
      const failureEvent = {
        requestId,
        source,
        clientId,
        userId: request.userId,
        chatId: request.chatId,
        error: err.message || 'Unknown AI error',
        timestamp: new Date()
      };

      await redisService.client.publish('ai.failed', JSON.stringify(failureEvent));
    }
  }
}

export const aiWorker = new AIWorker();

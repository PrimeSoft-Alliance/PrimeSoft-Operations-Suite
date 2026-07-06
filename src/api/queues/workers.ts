import { redisService } from '../services/redisService';
import { aiOrchestrator } from '../services/aiOrchestrator';
import pino from 'pino';

const logger = pino({ name: 'QueueWorkers' });

export class WorkerManager {
  private workers: any[] = [];

  constructor() {
    this.init();
  }

  private init() {
    // Workers disabled
  }

  private createWorker(queueName: string, processor: (job: any) => Promise<void>) {
    // No-op
  }
}

export const workerManager = new WorkerManager();

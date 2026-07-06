import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import pino from 'pino';
import fs from 'fs';

const logger = pino({ name: 'InfraService' });
const execAsync = promisify(exec);

export class InfraService {
  private readonly REDIS_PASSWORD = 'Awareness@709';
  private readonly REDIS_URL = `redis://:${this.REDIS_PASSWORD}@127.0.0.1:6379`;

  async ensureRedis() {
    logger.info('Redis disabled, skipping infra check');
  }

  private updateLocalEnv() {
    // Disabled
  }
}

export const infraService = new InfraService();

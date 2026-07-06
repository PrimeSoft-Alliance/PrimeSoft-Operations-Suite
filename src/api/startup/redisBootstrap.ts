import { infraService } from '../services/infraService';
import { redisService } from '../services/redisService';

export async function bootstrapRedis() {
  console.log('[OMNIREP] Initializing self-hosted infrastructure pulse...');
  
  // 1. Detect, Install, Configure Valkey/Redis
  await infraService.ensureRedis();

  // 2. Initialize Core Cluster Services (Queues, Adapters)
  await redisService.initQueues();

  console.log('[OMNIREP] Infrastructure pulse established.');
}

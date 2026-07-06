import express from 'express';
import { redisService } from '../services/redisService';

const router = express.Router();

router.get('/redis', async (req, res) => {
  const client = redisService.client;
  
  if (client && typeof client.ping === 'function' && client.status === 'ready') {
    try {
      const pingRes = await client.ping();
      let infoStr = '';
      try {
        infoStr = await client.info();
      } catch (e) {}

      let memory = '0.0M';
      let connected_clients = '0';
      let used_memory = '0.0M';
      let uptime = '0s';
      let version = 'Valkey/Redis';

      if (infoStr) {
        const lines = infoStr.split('\n');
        for (const line of lines) {
          if (line.startsWith('used_memory_human:')) {
            used_memory = line.split(':')[1].trim();
            memory = used_memory;
          }
          if (line.startsWith('connected_clients:')) {
            connected_clients = line.split(':')[1].trim();
          }
          if (line.startsWith('uptime_in_seconds:')) {
            uptime = line.split(':')[1].trim() + 's';
          }
          if (line.startsWith('redis_version:')) {
            version = line.split(':')[1].trim();
          }
        }
      }

      return res.json({
        status: 'healthy',
        ping: pingRes,
        memory,
        connected_clients,
        used_memory,
        uptime,
        version
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'unhealthy',
        error: err.message
      });
    }
  }

  res.json({
    status: 'healthy (local fallback)',
    ping: 'PONG',
    memory: '0.0M',
    connected_clients: '0',
    used_memory: '0.0M',
    uptime: 'N/A',
    version: 'local-in-memory-adapter'
  });
});

export default router;

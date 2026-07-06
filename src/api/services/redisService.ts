import { Queue } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { EventEmitter } from 'events';

const logger = pino({ name: 'RedisService' });

class InMemoryCache {
  private store = new Map<string, { value: string; expiry: number }>();

  public set(key: string, value: string, ttlSeconds: number) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiry });
  }

  public get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
}

class RedisService {
  public client: any;
  public subClient: any;
  public queues: Record<string, any> = {};
  private isRedisEnabled = false;
  private localCache = new InMemoryCache();

  constructor() {
    let redisUrl = process.env.REDIS_URL;
    let redisHost = process.env.REDIS_HOST;

    if (redisUrl && (redisUrl.startsWith('http://') || redisUrl.startsWith('https://'))) {
      logger.warn('REDIS_URL starts with HTTP/HTTPS. ioredis requires redis:// or rediss://. Ignoring REDIS_URL.');
      redisUrl = undefined;
    }
    if (redisHost && (redisHost.startsWith('http://') || redisHost.startsWith('https://'))) {
      logger.warn('REDIS_HOST starts with HTTP/HTTPS. ioredis requires a raw TCP hostname/IP. Ignoring REDIS_HOST.');
      redisHost = undefined;
    }

    if (redisUrl || redisHost) {
      try {
        let config: any;

        if (redisUrl) {
          // Custom robust parser for REDIS_URL to handle special characters like '@' in password
          try {
            let cleanUrl = redisUrl;
            let isTls = false;
            if (cleanUrl.startsWith('rediss://')) {
              cleanUrl = cleanUrl.substring(9);
              isTls = true;
            } else if (cleanUrl.startsWith('redis://')) {
              cleanUrl = cleanUrl.substring(8);
            }

            // Split at the last '@' to separate auth from host:port/db
            const lastAtIndex = cleanUrl.lastIndexOf('@');
            let auth = '';
            let hostPortDb = cleanUrl;
            if (lastAtIndex !== -1) {
              auth = cleanUrl.substring(0, lastAtIndex);
              hostPortDb = cleanUrl.substring(lastAtIndex + 1);
            }

            // Parse auth (could be "password" or ":password" or "user:password")
            let password: string | undefined = undefined;
            if (auth) {
              if (auth.startsWith(':')) {
                password = auth.substring(1);
              } else if (auth.includes(':')) {
                const parts = auth.split(':');
                password = parts.slice(1).join(':'); // handle password containing colons
              } else {
                password = auth;
              }
            }

            // Parse hostPortDb (could be "host:port/db" or "host:port" or "host")
            let host = '127.0.0.1';
            let port = 6379;
            let db: number | undefined = undefined;

            // Check for db part
            const slashIndex = hostPortDb.indexOf('/');
            let hostPort = hostPortDb;
            if (slashIndex !== -1) {
              hostPort = hostPortDb.substring(0, slashIndex);
              const dbStr = hostPortDb.substring(slashIndex + 1);
              if (dbStr) db = parseInt(dbStr, 10);
            }

            // Check for port
            const colonIndex = hostPort.lastIndexOf(':');
            if (colonIndex !== -1) {
              host = hostPort.substring(0, colonIndex);
              const portStr = hostPort.substring(colonIndex + 1);
              if (portStr) port = parseInt(portStr, 10);
            } else {
              host = hostPort;
            }

        config = {
          host,
          port,
          password,
          db,
          tls: isTls ? {} : undefined,
          connectTimeout: 5000,
          maxRetriesPerRequest: 3, // Prevent infinite hangs if Redis is missing
        };
            logger.info(`Parsed Redis URL successfully. Connecting to ${host}:${port}`);
          } catch (parseErr: any) {
            logger.error(`Failed to custom-parse REDIS_URL, falling back to direct string: ${parseErr.message}`);
            config = redisUrl;
          }
        } else {
        config = {
          host: redisHost || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          connectTimeout: 5000,
          maxRetriesPerRequest: 3,
        };
        }

        const commonOptions = {
          enableOfflineQueue: false,
          connectTimeout: 2000,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        };

        if (typeof config === 'string') {
          this.client = new Redis(config, commonOptions as any);
          this.subClient = new Redis(config, commonOptions as any);
        } else {
          this.client = new Redis({ ...config, ...commonOptions } as any);
          this.subClient = new Redis({ ...config, ...commonOptions } as any);
        }

        this.client.on('connect', () => {
          logger.info('Successfully connected to Redis server');
          this.isRedisEnabled = true;
        });

        this.client.on('error', (err: any) => {
          logger.warn(`Redis connection error, falling back to in-memory: ${err.message}`);
          this.fallbackToInMemory();
        });

        this.subClient.on('error', (err: any) => {
          logger.debug(`Redis subscriber connection error, falling back to in-memory: ${err.message}`);
          this.fallbackToInMemory();
        });
      } catch (err: any) {
        logger.error(`Failed to initialize real Redis client: ${err.message}`);
        this.fallbackToInMemory();
      }
    } else {
      logger.info('No valid REDIS_URL or REDIS_HOST configured; using local in-memory fallback.');
      this.fallbackToInMemory();
    }
  }

  private fallbackToInMemory() {
    this.isRedisEnabled = false;
    const emitter = new EventEmitter();
    
    this.client = {
      status: 'ready',
      on: (event: string, cb: any) => emitter.on(`client:${event}`, cb),
      set: async (key: string, val: string) => this.localCache.set(key, val, 3600),
      get: async (key: string) => this.localCache.get(key),
      publish: async (channel: string, message: string) => {
        emitter.emit('message', channel, message);
        return 1;
      },
      duplicate: () => this.client,
    };

    this.subClient = {
      status: 'ready',
      on: (event: string, cb: any) => emitter.on(event, cb),
      subscribe: async () => {},
      unsubscribe: async () => {},
      duplicate: () => this.subClient,
    };
  }

  public async initQueues() {
    logger.info('Initializing system background event queues...');
    if (!this.isRedisEnabled) {
      const mockQueue = {
        add: async () => {},
        close: async () => {},
        on: () => {},
      };
      this.queues['campaigns'] = mockQueue;
      this.queues['analytics'] = mockQueue;
      logger.info('Event queues initialized in mock mode (Redis disabled).');
      return;
    }

    const queueOpts = { connection: this.client };

    this.queues['campaigns'] = new Queue('campaigns', queueOpts);
    this.queues['analytics'] = new Queue('analytics', queueOpts);
    
    logger.info('Event queues initialized successfully.');
  }

  public async getAdapter() {
    if (this.isRedisEnabled) {
      try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        return createAdapter(this.client, this.subClient);
      } catch (e: any) {
        logger.error(`Failed to create socket.io Redis adapter: ${e.message}`);
        return null;
      }
    }
    return null;
  }

  // Generic cache helpers
  public async setCache(key: string, value: any, ttlSeconds: number = 3600) {
    const stringified = JSON.stringify(value);
    if (this.isRedisEnabled) {
      try {
        await this.client.set(key, stringified, 'EX', ttlSeconds);
      } catch (e: any) {
        logger.warn(`Failed to set Redis cache: ${e.message}`);
        this.localCache.set(key, stringified, ttlSeconds);
      }
    } else {
      this.localCache.set(key, stringified, ttlSeconds);
    }
  }

  public async getCache<T>(key: string): Promise<T | null> {
    if (this.isRedisEnabled) {
      try {
        const cached = await this.client.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (e: any) {
        logger.warn(`Failed to read from Redis cache: ${e.message}`);
      }
    }

    const localCached = this.localCache.get(key);
    if (localCached) {
      try {
        return JSON.parse(localCached) as T;
      } catch (e) {
        return null;
      }
    }

    return null;
  }
}

export const redisService = new RedisService();


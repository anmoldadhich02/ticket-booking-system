import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis unavailable, running with fallback mode');
            return null; // Stop retrying if not available
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Redis connection failed (${err.message}). Background scheduler will use in-process timers.`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis initialization error: ${err.message}`);
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Redis client disconnected');
    }
  }
}

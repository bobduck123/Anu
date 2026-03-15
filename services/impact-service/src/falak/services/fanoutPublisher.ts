import Redis from 'ioredis';
import logger from '../../utils/logger';
import { FanoutMessage } from '../domain/types';

export interface FanoutPublisher {
  publish(message: FanoutMessage): Promise<void>;
  close(): Promise<void>;
}

export class NoopFanoutPublisher implements FanoutPublisher {
  async publish(message: FanoutMessage): Promise<void> {
    logger.debug({ channel: message.channel, eventId: message.eventId }, 'Falak fanout skipped because Redis is not configured');
  }

  async close(): Promise<void> {
    return;
  }
}

export class RedisFanoutPublisher implements FanoutPublisher {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }

  async publish(message: FanoutMessage): Promise<void> {
    if (this.redis.status === 'wait') {
      await this.redis.connect();
    }

    await this.redis.publish(message.channel, JSON.stringify(message));
  }

  async close(): Promise<void> {
    if (this.redis.status === 'ready' || this.redis.status === 'connect') {
      await this.redis.quit();
      return;
    }

    if (this.redis.status !== 'end') {
      this.redis.disconnect();
    }
  }
}

export function createFanoutPublisher(redisUrl?: string): FanoutPublisher {
  if (!redisUrl) {
    return new NoopFanoutPublisher();
  }

  return new RedisFanoutPublisher(redisUrl);
}

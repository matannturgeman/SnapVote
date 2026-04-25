import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '@nestjs-labs/nestjs-ioredis';
import type { Redis } from 'ioredis';
import { Observable } from 'rxjs';
import type { PollStreamEventDto } from '@libs/shared-dto';

const PRESENCE_KEY_PREFIX = 'poll-presence';
const CHANNEL_PREFIX = 'poll-results';
const PRESENCE_TTL_SECONDS = 60;

@Injectable()
export class PollStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(PollStreamService.name);
  private readonly redis: Redis | null;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrNil();
  }

  async publish(pollId: string, event: PollStreamEventDto): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.publish(
        `${CHANNEL_PREFIX}:${pollId}`,
        JSON.stringify(event),
      );
    } catch (err) {
      this.logger.error(
        `Failed to publish stream event for poll ${pollId}: ${err}`,
      );
    }
  }

  subscribe(pollId: string): Observable<PollStreamEventDto> {
    return new Observable((observer) => {
      if (!this.redis) {
        observer.complete();
        return;
      }

      const channel = `${CHANNEL_PREFIX}:${pollId}`;
      const sub = this.redis.duplicate();

      sub.subscribe(channel, (err) => {
        if (err) {
          this.logger.error(`Subscribe error for ${channel}: ${err.message}`);
          observer.error(err);
        }
      });

      const onMessage = (_chan: string, message: string) => {
        try {
          const event = JSON.parse(message) as PollStreamEventDto;
          observer.next(event);
        } catch {
          // ignore malformed messages
        }
      };

      sub.on('message', onMessage);

      return () => {
        sub.unsubscribe(channel).finally(() => sub.disconnect());
      };
    });
  }

  async incrementPresence(pollId: string): Promise<number> {
    if (!this.redis) return 0;
    const key = `${PRESENCE_KEY_PREFIX}:${pollId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, PRESENCE_TTL_SECONDS);
    return count;
  }

  async decrementPresence(pollId: string): Promise<number> {
    if (!this.redis) return 0;
    const key = `${PRESENCE_KEY_PREFIX}:${pollId}`;
    const count = await this.redis.decr(key);
    if (count <= 0) {
      await this.redis.del(key);
      return 0;
    }
    await this.redis.expire(key, PRESENCE_TTL_SECONDS);
    return count;
  }

  async getPresence(pollId: string): Promise<number> {
    if (!this.redis) return 0;
    const val = await this.redis.get(`${PRESENCE_KEY_PREFIX}:${pollId}`);
    return val ? Math.max(0, parseInt(val, 10)) : 0;
  }

  onModuleDestroy(): void {
    // per-subscription duplicates disconnect themselves on teardown
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@nestjs-labs/nestjs-ioredis';
import type Redis from 'ioredis';
import type { PollResultsDto } from '@libs/shared-dto';

const POLL_CHANNEL = (pollId: string) => `poll:${pollId}`;

@Injectable()
export class PollStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly redisClient: Redis | null;
  private readonly subscribers = new Map<string, Set<(data: string) => void>>();

  constructor(private readonly redisService: RedisService) {
    this.redisClient = this.redisService.getOrNil();
  }

  async onModuleInit() {
    if (this.redisClient) {
      const client = this.redisClient.duplicate();
      await client.subscribe('poll:announce');
      client.on('message', (channel, message) => {
        const pollId = channel
          .replace('poll:announce:', '')
          .replace('poll:', '');
        if (pollId && this.subscribers.has(pollId)) {
          this.subscribers.get(pollId)?.forEach((cb) => cb(message));
        }
      });
    }
  }

  async onModuleDestroy() {
    this.subscribers.clear();
  }

  subscribe(pollId: string, callback: (data: string) => void): () => void {
    if (!this.subscribers.has(pollId)) {
      this.subscribers.set(pollId, new Set());
    }
    this.subscribers.get(pollId)!.add(callback);

    return () => {
      this.subscribers.get(pollId)?.delete(callback);
      if (this.subscribers.get(pollId)?.size === 0) {
        this.subscribers.delete(pollId);
      }
    };
  }

  async publishResults(pollId: string, results: PollResultsDto): Promise<void> {
    const message = JSON.stringify({ type: 'results', data: results });
    if (this.redisClient) {
      await this.redisClient.publish(POLL_CHANNEL(pollId), message);
    }
    this.subscribers.get(pollId)?.forEach((cb) => cb(message));
  }

  async publishPresence(pollId: string, count: number): Promise<void> {
    const message = JSON.stringify({ type: 'presence', data: { count } });
    this.subscribers.get(pollId)?.forEach((cb) => cb(message));
  }
}

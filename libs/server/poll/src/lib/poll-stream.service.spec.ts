import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { PollStreamService } from './poll-stream.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRedisClient = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  on: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  get: jest.fn(),
  duplicate: jest.fn(),
};

jest.mock('@nestjs-labs/nestjs-ioredis', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    getOrNil: () => mockRedisClient,
  })),
}));

const { RedisService } = jest.requireMock('@nestjs-labs/nestjs-ioredis');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildService(): PollStreamService {
  const redisService = new RedisService();
  return new PollStreamService(redisService);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PollStreamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // publish
  // ---------------------------------------------------------------------------

  describe('publish', () => {
    it('publishes a JSON-serialized event to the poll channel', async () => {
      mockRedisClient.publish.mockResolvedValue(1);
      const service = buildService();

      await service.publish('poll-1', {
        type: 'results',
        data: {
          pollId: 'poll-1',
          totalVotes: 5,
          options: [],
          myVote: null,
        },
      });

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'poll-results:poll-1',
        expect.stringContaining('"type":"results"'),
      );
    });

    it('does not throw when Redis is unavailable', async () => {
      const redisService = { getOrNil: () => null } as never;
      const service = new PollStreamService(redisService);

      await expect(
        service.publish('poll-1', {
          type: 'closed',
          data: { pollId: 'poll-1' },
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // subscribe
  // ---------------------------------------------------------------------------

  describe('subscribe', () => {
    it('returns an Observable that emits parsed events from Redis messages', async () => {
      const messageHandlers: Array<(channel: string, msg: string) => void> = [];

      const mockSub = {
        subscribe: jest.fn((_channel: string, cb: (err: null) => void) => {
          cb(null);
        }),
        on: jest.fn(
          (_event: string, handler: (channel: string, msg: string) => void) => {
            messageHandlers.push(handler);
          },
        ),
        unsubscribe: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
      };

      mockRedisClient.duplicate.mockReturnValue(mockSub);

      const service = buildService();
      const obs = service.subscribe('poll-1');

      const resultsPromise = firstValueFrom(obs.pipe(take(1), toArray()));

      // Simulate Redis publishing a message
      await new Promise((r) => setTimeout(r, 5));
      messageHandlers.forEach((h) =>
        h(
          'poll-results:poll-1',
          JSON.stringify({ type: 'presence', data: { count: 2 } }),
        ),
      );

      const events = await resultsPromise;
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'presence', data: { count: 2 } });
    });

    it('completes immediately when Redis is unavailable', async () => {
      const redisService = { getOrNil: () => null } as never;
      const service = new PollStreamService(redisService);

      const events = await firstValueFrom(
        service.subscribe('poll-1').pipe(toArray()),
      );
      expect(events).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // incrementPresence
  // ---------------------------------------------------------------------------

  describe('incrementPresence', () => {
    it('increments the Redis key and returns the new count', async () => {
      mockRedisClient.incr.mockResolvedValue(3);
      mockRedisClient.expire.mockResolvedValue(1);
      const service = buildService();

      const count = await service.incrementPresence('poll-1');

      expect(mockRedisClient.incr).toHaveBeenCalledWith('poll-presence:poll-1');
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'poll-presence:poll-1',
        60,
      );
      expect(count).toBe(3);
    });

    it('returns 0 when Redis is unavailable', async () => {
      const redisService = { getOrNil: () => null } as never;
      const service = new PollStreamService(redisService);
      expect(await service.incrementPresence('poll-1')).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // decrementPresence
  // ---------------------------------------------------------------------------

  describe('decrementPresence', () => {
    it('decrements the Redis key and returns the new count', async () => {
      mockRedisClient.decr.mockResolvedValue(2);
      mockRedisClient.expire.mockResolvedValue(1);
      const service = buildService();

      const count = await service.decrementPresence('poll-1');

      expect(mockRedisClient.decr).toHaveBeenCalledWith('poll-presence:poll-1');
      expect(count).toBe(2);
    });

    it('deletes the key and returns 0 when count reaches zero', async () => {
      mockRedisClient.decr.mockResolvedValue(0);
      mockRedisClient.del.mockResolvedValue(1);
      const service = buildService();

      const count = await service.decrementPresence('poll-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('poll-presence:poll-1');
      expect(count).toBe(0);
    });

    it('deletes the key and returns 0 when count goes negative', async () => {
      mockRedisClient.decr.mockResolvedValue(-1);
      mockRedisClient.del.mockResolvedValue(1);
      const service = buildService();

      const count = await service.decrementPresence('poll-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('poll-presence:poll-1');
      expect(count).toBe(0);
    });

    it('returns 0 when Redis is unavailable', async () => {
      const redisService = { getOrNil: () => null } as never;
      const service = new PollStreamService(redisService);
      expect(await service.decrementPresence('poll-1')).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getPresence
  // ---------------------------------------------------------------------------

  describe('getPresence', () => {
    it('returns parsed count from Redis', async () => {
      mockRedisClient.get.mockResolvedValue('7');
      const service = buildService();

      const count = await service.getPresence('poll-1');

      expect(mockRedisClient.get).toHaveBeenCalledWith('poll-presence:poll-1');
      expect(count).toBe(7);
    });

    it('returns 0 when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const service = buildService();

      expect(await service.getPresence('poll-1')).toBe(0);
    });

    it('returns 0 when Redis is unavailable', async () => {
      const redisService = { getOrNil: () => null } as never;
      const service = new PollStreamService(redisService);
      expect(await service.getPresence('poll-1')).toBe(0);
    });
  });
});

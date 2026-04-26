import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { RedisService } from '@nestjs-labs/nestjs-ioredis';

jest.mock('@libs/server-data-access', () => ({
  prisma: { $queryRaw: jest.fn() },
}));

import { prisma } from '@libs/server-data-access';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRedisService(
  pingResult: 'ok' | 'error' | 'missing',
): RedisService {
  if (pingResult === 'missing') {
    return { getOrNil: () => null } as unknown as RedisService;
  }

  const ping =
    pingResult === 'ok'
      ? jest.fn().mockResolvedValue('PONG')
      : jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

  return { getOrNil: () => ({ ping }) } as unknown as RedisService;
}

describe('HealthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when DB and Redis are healthy', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController(makeRedisService('ok'));

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.checks.db.status).toBe('ok');
    expect(result.checks.redis.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns 503 degraded when DB is down', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('Connection refused'),
    );
    const controller = new HealthController(makeRedisService('ok'));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns 503 degraded when Redis is down', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController(makeRedisService('error'));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns 503 degraded when Redis client is unavailable', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController(makeRedisService('missing'));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('includes error details in degraded response', async () => {
    (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('DB timeout'),
    );
    const controller = new HealthController(makeRedisService('ok'));

    try {
      await controller.check();
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      const response = (err as ServiceUnavailableException).getResponse() as {
        checks: { db: { status: string; error: string } };
      };
      expect(response.checks.db.status).toBe('error');
      expect(response.checks.db.error).toBe('DB timeout');
    }
  });
});

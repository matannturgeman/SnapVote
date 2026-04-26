import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisService } from '@nestjs-labs/nestjs-ioredis';
import { prisma } from '@libs/server-data-access';
import { Public } from '@libs/server-auth';

interface CheckResult {
  status: 'ok' | 'error';
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: {
    db: CheckResult;
    redis: CheckResult;
  };
  uptime: number;
  timestamp: string;
}

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthResponse> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);

    const status =
      db.status === 'ok' && redis.status === 'ok' ? 'ok' : 'degraded';
    const response: HealthResponse = {
      status,
      checks: { db, redis },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    if (status === 'degraded') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async checkDb(): Promise<CheckResult> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const client = this.redisService.getOrNil();

    if (!client) {
      return { status: 'error', error: 'Redis client unavailable' };
    }

    try {
      await client.ping();
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

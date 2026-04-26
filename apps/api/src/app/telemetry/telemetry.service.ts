import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@nestjs-labs/nestjs-ioredis';
import type { Redis } from 'ioredis';
import type { TelemetryRecord } from './telemetry.types';

const TELEMETRY_TTL_SECONDS = 60 * 60 * 24;
const TELEMETRY_KEY_PREFIX = 'telemetry:request';
const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password',
  'authorization',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'token',
  'secret',
  'cookie',
  'set-cookie',
  'resettoken',
  'passwordhash',
]);

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly redisClient: Redis | null;
  private redisJsonUnsupported = false;
  private redisJsonWarningLogged = false;

  constructor(private readonly redisService: RedisService) {
    this.redisClient = this.redisService.getOrNil();
  }

  generateBackendRequestId(): string {
    return randomUUID();
  }

  async record(record: TelemetryRecord): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const key = this.buildRedisKey(record);
    const sanitizedPayload = this.sanitizeValue(record);
    const serializedPayload = JSON.stringify(sanitizedPayload);

    try {
      if (!this.redisJsonUnsupported) {
        await this.redisClient.call('JSON.SET', key, '$', serializedPayload);
        await this.redisClient.expire(key, TELEMETRY_TTL_SECONDS);
        return;
      }

      await this.redisClient.set(
        key,
        serializedPayload,
        'EX',
        TELEMETRY_TTL_SECONDS,
      );
    } catch (error) {
      if (this.isJsonSetUnsupportedError(error)) {
        this.redisJsonUnsupported = true;

        if (!this.redisJsonWarningLogged) {
          this.redisJsonWarningLogged = true;
          this.logger.warn(
            'RedisJSON is not available. Falling back to SET with JSON string payload. Install Redis Stack for JSON.SET support.',
          );
        }

        try {
          await this.redisClient.set(
            key,
            serializedPayload,
            'EX',
            TELEMETRY_TTL_SECONDS,
          );
        } catch (fallbackError) {
          this.logRedisError(fallbackError);
        }

        return;
      }

      this.logRedisError(error);
    }
  }

  private buildRedisKey(record: TelemetryRecord): string {
    const userIdSegment = record.user.id?.toString() ?? 'anonymous';
    const routeSegment = this.normalizeKeySegment(record.route);

    return `${TELEMETRY_KEY_PREFIX}:user:${userIdSegment}:route:${routeSegment}:${record.backendRequestId}`;
  }

  private normalizeKeySegment(value: string): string {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return normalized.length > 0 ? normalized : 'unknown';
  }

  private isJsonSetUnsupportedError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);

    return /unknown command\s+['"]JSON\.SET['"]/i.test(message);
  }

  private logRedisError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to store telemetry in Redis: ${message}`);
  }

  private sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
    if (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (typeof value !== 'object') {
      return String(value);
    }

    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((entry) => this.sanitizeValue(entry, seen));
    }

    const source = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(source)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = REDACTED_VALUE;
        continue;
      }

      sanitized[key] = this.sanitizeValue(nestedValue, seen);
    }

    return sanitized;
  }
}

import type { RedisService } from '@nestjs-labs/nestjs-ioredis';
import { TelemetryService } from './telemetry.service';
import type { TelemetryRecord } from './telemetry.types';

describe('TelemetryService', () => {
  const baseRecord: TelemetryRecord = {
    backendRequestId: 'backend-req-1',
    action: 'POST /api/auth/login',
    method: 'POST',
    route: '/api/auth/login',
    statusCode: 200,
    durationMs: 42,
    success: true,
    request: {
      body: {
        email: 'matan@example.com',
        password: 'plain-text-password',
      },
      params: {},
      query: {},
    },
    response: {
      accessToken: 'super-secret-token',
      user: {
        id: 7,
      },
    },
    user: {
      id: 7,
      email: 'matan@example.com',
      name: 'Matan',
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'client-req-123',
      referer: null,
    },
  };

  it('stores telemetry as Redis JSON document with 1-day TTL and redacts secrets when RedisJSON is available', async () => {
    const call = jest.fn().mockResolvedValue('OK');
    const expire = jest.fn().mockResolvedValue(1);
    const set = jest.fn().mockResolvedValue('OK');
    const redisService = {
      getOrNil: jest.fn().mockReturnValue({ call, expire, set }),
    } as unknown as RedisService;

    const service = new TelemetryService(redisService);

    await service.record(baseRecord);

    expect(call).toHaveBeenCalledTimes(1);
    const [command, key, path, payload] = call.mock.calls[0] as [
      string,
      string,
      string,
      string,
    ];

    expect(command).toBe('JSON.SET');
    expect(key).toBe(
      'telemetry:request:user:7:route:api_auth_login:backend-req-1',
    );
    expect(path).toBe('$');

    expect(expire).toHaveBeenCalledWith(
      'telemetry:request:user:7:route:api_auth_login:backend-req-1',
      86400,
    );
    expect(set).not.toHaveBeenCalled();

    const parsedPayload = JSON.parse(payload) as TelemetryRecord;
    expect(parsedPayload.request.body).toEqual({
      email: 'matan@example.com',
      password: '[REDACTED]',
    });
    expect(parsedPayload.response).toEqual({
      accessToken: '[REDACTED]',
      user: {
        id: 7,
      },
    });
  });

  it('falls back to SET when JSON.SET is unsupported', async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "ERR unknown command 'JSON.SET', with args beginning with: 'telemetry:key'",
        ),
      );
    const expire = jest.fn().mockResolvedValue(1);
    const set = jest.fn().mockResolvedValue('OK');
    const redisService = {
      getOrNil: jest.fn().mockReturnValue({ call, expire, set }),
    } as unknown as RedisService;

    const service = new TelemetryService(redisService);

    await service.record(baseRecord);
    await service.record({
      ...baseRecord,
      backendRequestId: 'backend-req-2',
    });

    expect(call).toHaveBeenCalledTimes(1);
    expect(expire).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenNthCalledWith(
      1,
      'telemetry:request:user:7:route:api_auth_login:backend-req-1',
      expect.any(String),
      'EX',
      86400,
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      'telemetry:request:user:7:route:api_auth_login:backend-req-2',
      expect.any(String),
      'EX',
      86400,
    );
  });

  it('uses anonymous user segment when user id is missing', async () => {
    const call = jest.fn().mockResolvedValue('OK');
    const expire = jest.fn().mockResolvedValue(1);
    const set = jest.fn().mockResolvedValue('OK');
    const redisService = {
      getOrNil: jest.fn().mockReturnValue({ call, expire, set }),
    } as unknown as RedisService;

    const service = new TelemetryService(redisService);

    await service.record({
      ...baseRecord,
      user: {
        id: null,
        email: null,
        name: null,
      },
      route: '/',
    });

    expect(call).toHaveBeenCalledWith(
      'JSON.SET',
      'telemetry:request:user:anonymous:route:unknown:backend-req-1',
      '$',
      expect.any(String),
    );
  });

  it('does not throw when redis is unavailable', async () => {
    const redisService = {
      getOrNil: jest.fn().mockReturnValue(null),
    } as unknown as RedisService;

    const service = new TelemetryService(redisService);

    await expect(service.record(baseRecord)).resolves.toBeUndefined();
  });

  it('does not throw when redis commands fail', async () => {
    const call = jest.fn().mockRejectedValue(new Error('some redis error'));
    const expire = jest.fn().mockResolvedValue(1);
    const set = jest.fn().mockResolvedValue('OK');
    const redisService = {
      getOrNil: jest.fn().mockReturnValue({ call, expire, set }),
    } as unknown as RedisService;

    const service = new TelemetryService(redisService);

    await expect(service.record(baseRecord)).resolves.toBeUndefined();
  });

  it('generates backend request ids', () => {
    const redisService = {
      getOrNil: jest.fn().mockReturnValue(null),
    } as unknown as RedisService;

    const service = new TelemetryService(redisService);
    const requestId = service.generateBackendRequestId();

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

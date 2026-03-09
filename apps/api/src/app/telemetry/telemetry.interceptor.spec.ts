import { HttpException, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { TelemetryInterceptor } from './telemetry.interceptor';
import type { TelemetryService } from './telemetry.service';

describe('TelemetryInterceptor', () => {
  const createHttpContext = (request: Record<string, unknown>, response: Record<string, unknown>) =>
    ({
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  it('captures successful requests and responses', async () => {
    const telemetryService = {
      generateBackendRequestId: jest.fn().mockReturnValue('backend-req-1'),
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as TelemetryService;

    const interceptor = new TelemetryInterceptor(telemetryService);

    const request = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      body: {
        email: 'matan@example.com',
        password: 'plain-text-password',
      },
      params: {},
      query: {},
      headers: {
        'x-request-id': 'client-req-1',
        'user-agent': 'jest',
      },
      ip: '127.0.0.1',
      user: {
        id: 7,
        email: 'matan@example.com',
        name: 'Matan',
      },
    };

    const response = {
      statusCode: 201,
      setHeader: jest.fn(),
    };

    const context = createHttpContext(request, response);
    const next = {
      handle: jest.fn(() => of({
        userId: 7,
        accessToken: 'token-value',
      })),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
      userId: 7,
      accessToken: 'token-value',
    });

    expect(response.setHeader).toHaveBeenCalledWith(
      'x-backend-request-id',
      'backend-req-1',
    );
    expect(telemetryService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        backendRequestId: 'backend-req-1',
        action: 'POST /api/auth/login',
        method: 'POST',
        route: '/api/auth/login',
        statusCode: 201,
        success: true,
        request: {
          body: request.body,
          params: {},
          query: {},
        },
        response: {
          userId: 7,
          accessToken: 'token-value',
        },
        user: {
          id: 7,
          email: 'matan@example.com',
          name: 'Matan',
        },
        metadata: expect.objectContaining({
          ip: '127.0.0.1',
          userAgent: 'jest',
          requestId: 'client-req-1',
        }),
      }),
    );
  });

  it('captures failed requests and keeps propagating errors', async () => {
    const telemetryService = {
      generateBackendRequestId: jest.fn().mockReturnValue('backend-req-2'),
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as TelemetryService;

    const interceptor = new TelemetryInterceptor(telemetryService);

    const request = {
      method: 'GET',
      originalUrl: '/api/auth/me',
      headers: {
        'x-request-id': 'client-req-2',
      },
    };

    const response = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    const context = createHttpContext(request, response);
    const error = new HttpException({
      message: 'Unauthorized',
      code: 'AUTH_REQUIRED',
    }, 401);

    const next = {
      handle: jest.fn(() => throwError(() => error)),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(error);

    expect(telemetryService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        backendRequestId: 'backend-req-2',
        action: 'GET /api/auth/me',
        method: 'GET',
        route: '/api/auth/me',
        statusCode: 401,
        success: false,
        response: expect.objectContaining({
          statusCode: 401,
          message: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        }),
      }),
    );
  });

  it('skips telemetry for non-http context', async () => {
    const telemetryService = {
      generateBackendRequestId: jest.fn().mockReturnValue('backend-req-3'),
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as TelemetryService;

    const interceptor = new TelemetryInterceptor(telemetryService);
    const context = {
      getType: jest.fn().mockReturnValue('rpc'),
    } as unknown as ExecutionContext;
    const next = {
      handle: jest.fn(() => of('ok')),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe('ok');

    expect(telemetryService.generateBackendRequestId).not.toHaveBeenCalled();
    expect(telemetryService.record).not.toHaveBeenCalled();
  });
});

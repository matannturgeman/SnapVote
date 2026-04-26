import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { LoggedInUser } from '@libs/server-user';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import { TelemetryService } from './telemetry.service';
import type { TelemetryRecord } from './telemetry.types';

interface TelemetryRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  route?: {
    path?: string;
  };
  body?: unknown;
  params?: unknown;
  query?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: LoggedInUser;
}

interface TelemetryResponse {
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
}

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetryService: TelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'http' | 'rpc' | 'ws'>() !== 'http') {
      return next.handle();
    }

    const startedAt = Date.now();
    const request = context.switchToHttp().getRequest<TelemetryRequest>();
    const response = context.switchToHttp().getResponse<TelemetryResponse>();
    const backendRequestId = this.telemetryService.generateBackendRequestId();

    response.setHeader?.('x-backend-request-id', backendRequestId);

    return next.handle().pipe(
      tap((responseBody) => {
        const baseRecord = this.buildBaseRecord(
          request,
          backendRequestId,
          startedAt,
        );

        void this.telemetryService.record({
          ...baseRecord,
          statusCode: response.statusCode ?? 200,
          success: true,
          response: responseBody,
        });
      }),
      catchError((error: unknown) => {
        const baseRecord = this.buildBaseRecord(
          request,
          backendRequestId,
          startedAt,
        );
        const statusCode = this.resolveStatusCode(error, response.statusCode);

        void this.telemetryService.record({
          ...baseRecord,
          statusCode,
          success: false,
          response: this.buildErrorResponse(error, statusCode),
        });

        return throwError(() => error);
      }),
    );
  }

  private buildBaseRecord(
    request: TelemetryRequest,
    backendRequestId: string,
    startedAt: number,
  ): Omit<TelemetryRecord, 'statusCode' | 'success' | 'response'> {
    const method = request.method ?? 'UNKNOWN';
    const route =
      request.originalUrl ?? request.url ?? request.route?.path ?? 'unknown';
    const headers = request.headers;
    const params = request.params as Record<string, string> | null | undefined;

    return {
      backendRequestId,
      action: `${method} ${route}`,
      method,
      route,
      durationMs: Date.now() - startedAt,
      request: {
        body: request.body ?? null,
        params: request.params ?? null,
        query: request.query ?? null,
      },
      user: {
        id: request.user?.id ?? null,
        email: request.user?.email ?? null,
        name: request.user?.name ?? null,
      },
      domain: {
        pollId: params?.['id'] ?? null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ip:
          request.ip ?? this.getHeaderValue(headers, 'x-forwarded-for') ?? null,
        userAgent: this.getHeaderValue(headers, 'user-agent') ?? null,
        requestId: this.getHeaderValue(headers, 'x-request-id') ?? null,
        referer: this.getHeaderValue(headers, 'referer') ?? null,
      },
    };
  }

  private resolveStatusCode(error: unknown, fallbackStatus?: number): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    if (fallbackStatus !== undefined && fallbackStatus >= 400) {
      return fallbackStatus;
    }

    return 500;
  }

  private buildErrorResponse(error: unknown, statusCode: number): unknown {
    if (error instanceof HttpException) {
      const errorResponse = error.getResponse();

      if (typeof errorResponse === 'string') {
        return {
          statusCode,
          message: errorResponse,
        };
      }

      return {
        statusCode,
        ...(errorResponse as Record<string, unknown>),
      };
    }

    if (error instanceof Error) {
      return {
        statusCode,
        name: error.name,
        message: error.message,
      };
    }

    return {
      statusCode,
      message: 'Unknown error',
    };
  }

  private getHeaderValue(
    headers: Record<string, string | string[] | undefined> | undefined,
    headerName: string,
  ): string | null {
    if (!headers) {
      return null;
    }

    const normalizedName = headerName.toLowerCase();

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== normalizedName || value === undefined) {
        continue;
      }

      return Array.isArray(value) ? value.join(',') : value;
    }

    return null;
  }
}

// libs/backend-data-access/src/lib/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (
      exception instanceof Error &&
      exception.constructor.name === 'ZodError' &&
      Array.isArray((exception as any).issues)
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).issues
        .map((e: { message: string }) => e.message)
        .join(', ');
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = (exception as any).message || 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}

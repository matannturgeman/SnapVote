import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';
import type { ArgumentsHost } from '@nestjs/common';
import { ZodError, ZodIssueCode } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ArgumentsHost mock that captures response.status().json() calls. */
function buildHost(): {
  host: ArgumentsHost;
  jsonMock: jest.Mock;
  statusMock: jest.Mock;
} {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusMock }),
    }),
  } as unknown as ArgumentsHost;

  return { host, jsonMock, statusMock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  // ── HttpException ──────────────────────────────────────────────────────────

  describe('when the exception is an HttpException', () => {
    it('uses the exception status code', () => {
      const { host, statusMock } = buildHost();
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('uses the exception message', () => {
      const { host, jsonMock } = buildHost();
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      const payload = jsonMock.mock.calls[0][0];
      expect(payload.message).toBe('Not Found');
    });

    it('includes statusCode and timestamp in the response body', () => {
      const { host, jsonMock } = buildHost();
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, host);

      const payload = jsonMock.mock.calls[0][0];
      expect(payload.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(typeof payload.timestamp).toBe('string');
      expect(() => new Date(payload.timestamp)).not.toThrow();
    });

    it('handles a 400 Bad Request HttpException', () => {
      const { host, jsonMock, statusMock } = buildHost();
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock.mock.calls[0][0].message).toBe('Bad Request');
    });

    it('handles a 401 Unauthorized HttpException', () => {
      const { host, statusMock } = buildHost();
      const exception = new HttpException(
        'Unauthorized',
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });
  });

  // ── ZodError ───────────────────────────────────────────────────────────────

  describe('when the exception is a ZodError', () => {
    function makeZodError(messages: string[]): ZodError {
      return new ZodError(
        messages.map((msg) => ({
          code: ZodIssueCode.custom,
          path: [],
          message: msg,
        })),
      );
    }

    it('returns status 400', () => {
      const { host, statusMock } = buildHost();
      filter.catch(makeZodError(['field is required']), host);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('joins all issue messages with ", "', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(
        makeZodError(['name is required', 'email is invalid']),
        host,
      );
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.message).toBe('name is required, email is invalid');
    });

    it('handles a single issue message without extra commas', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(makeZodError(['email is invalid']), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.message).toBe('email is invalid');
    });

    it('includes statusCode 400 in the response body', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(makeZodError(['bad input']), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('includes a timestamp in the response body', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(makeZodError(['bad input']), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(typeof payload.timestamp).toBe('string');
    });
  });

  // ── Generic Error ──────────────────────────────────────────────────────────

  describe('when the exception is a generic Error', () => {
    it('returns status 500', () => {
      const { host, statusMock } = buildHost();
      filter.catch(new Error('something went wrong'), host);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('uses the error message', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(new Error('something went wrong'), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.message).toBe('something went wrong');
    });

    it('returns statusCode 500 in the response body', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(new Error('boom'), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('returns a timestamp in the response body', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(new Error('boom'), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(typeof payload.timestamp).toBe('string');
    });
  });

  // ── Unknown / non-Error thrown value ──────────────────────────────────────

  describe('when the exception is an unknown non-Error value', () => {
    it('returns status 500 for a thrown string', () => {
      const { host, statusMock } = buildHost();
      filter.catch('unexpected string thrown', host);
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('falls back to "Internal server error" message when .message is absent', () => {
      const { host, jsonMock } = buildHost();
      filter.catch({ code: 42 }, host);
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.message).toBe('Internal server error');
    });
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  describe('response shape', () => {
    it('always contains exactly statusCode, timestamp, and message keys', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(new HttpException('OK', HttpStatus.OK), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(Object.keys(payload).sort()).toEqual([
        'message',
        'statusCode',
        'timestamp',
      ]);
    });

    it('timestamp is a valid ISO 8601 string', () => {
      const { host, jsonMock } = buildHost();
      filter.catch(new Error('ts check'), host);
      const payload = jsonMock.mock.calls[0][0];
      expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
    });
  });
});

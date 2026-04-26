import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './logged-in-user.decorator';
import { CurrentUserMiddleware } from './current-user.middleware';
import type { LoggedInUser } from './logged-in-user.interface';

const mockUser: LoggedInUser = {
  id: 1,
  email: 'user@example.com',
  name: 'Test User',
};

const buildContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext);

/**
 * createParamDecorator returns a factory function. NestJS internally calls the
 * factory at runtime; to unit-test it we extract the factory stored in the
 * decorator's metadata via the ROUTE_ARGS_METADATA reflect key.
 *
 * The simpler approach used in this project (matching auth.decorator.spec.ts
 * pattern) is to extract the raw callback from the created decorator directly.
 * createParamDecorator stores the factory on the returned value via the
 * `PARAMTYPES_METADATA` / custom-decorator mechanisms.
 *
 * The safest cross-version approach: call `CurrentUser` as a plain function to
 * get the decorated-parameter descriptor, then extract the factory via
 * Reflect.getMetadata using the ROUTE_ARGS_METADATA key.
 *
 * Because the metadata key path is fragile across NestJS versions we instead
 * test the decorator indirectly by triggering a real NestJS handler invocation
 * using @nestjs/testing + a throwaway controller — but that requires full DI.
 *
 * The idiomatic low-dependency approach for this codebase: reach into the
 * stored factory via the symbol NestJS registers, identical to how the
 * auth.guard.spec.ts invokes the guard directly. For param decorators the
 * factory is stored under ROUTE_ARGS_METADATA on the class.prototype method.
 */

// Helper: extract the createParamDecorator callback for direct invocation.
// NestJS stores it as the `factory` property on the EnhancerMetadata object
// registered under ROUTE_ARGS_METADATA. We retrieve it by applying the
// decorator to a throw-away class and reading back the metadata.
function extractDecoratorFactory(
  decoratorFactory: (...args: unknown[]) => ParameterDecorator,
  data?: unknown,
): (data: unknown, ctx: ExecutionContext) => unknown {
  class Target {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handler(_param: unknown) {
      return undefined;
    }
  }

  // Apply the decorator (with the given data argument) to parameter 0.
  decoratorFactory(data)(Target.prototype, 'handler', 0);

  const ROUTE_ARGS_METADATA = '__routeArguments__';
  const meta: Record<string, { factory: (d: unknown, ctx: ExecutionContext) => unknown }> =
    Reflect.getMetadata(ROUTE_ARGS_METADATA, Target.prototype.constructor, 'handler') ?? {};

  // The metadata key is `${type}:${index}`. We want the first (and only) entry.
  const entry = Object.values(meta)[0];
  return entry.factory;
}

describe('CurrentUser decorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => unknown;

  beforeAll(() => {
    // Extract the factory once — it is the same function regardless of `data`.
    factory = extractDecoratorFactory(CurrentUser as (...args: unknown[]) => ParameterDecorator);
  });

  it('returns the full user object when no field is specified', () => {
    const ctx = buildContext({ user: mockUser });
    const result = factory(undefined, ctx);
    expect(result).toEqual(mockUser);
  });

  it('returns a specific field when a field key is provided', () => {
    const ctx = buildContext({ user: mockUser });

    // Re-extract with the 'email' data argument so the factory closure captures it.
    const emailFactory = extractDecoratorFactory(
      CurrentUser as (...args: unknown[]) => ParameterDecorator,
      'email',
    );
    const result = emailFactory('email', ctx);
    expect(result).toBe('user@example.com');
  });

  it('returns the name field when field key is "name"', () => {
    const ctx = buildContext({ user: mockUser });
    const nameFactory = extractDecoratorFactory(
      CurrentUser as (...args: unknown[]) => ParameterDecorator,
      'name',
    );
    const result = nameFactory('name', ctx);
    expect(result).toBe('Test User');
  });

  it('returns the id field when field key is "id"', () => {
    const ctx = buildContext({ user: mockUser });
    const idFactory = extractDecoratorFactory(
      CurrentUser as (...args: unknown[]) => ParameterDecorator,
      'id',
    );
    const result = idFactory('id', ctx);
    expect(result).toBe(1);
  });

  it('returns undefined when there is no user on the request', () => {
    const ctx = buildContext({});
    const result = factory(undefined, ctx);
    expect(result).toBeUndefined();
  });

  it('returns undefined for a specific field when there is no user on the request', () => {
    const ctx = buildContext({});
    const emailFactory = extractDecoratorFactory(
      CurrentUser as (...args: unknown[]) => ParameterDecorator,
      'email',
    );
    const result = emailFactory('email', ctx);
    expect(result).toBeUndefined();
  });
});

describe('CurrentUserMiddleware', () => {
  let middleware: CurrentUserMiddleware;

  beforeEach(() => {
    middleware = new CurrentUserMiddleware();
  });

  it('calls next() immediately (pass-through behavior)', () => {
    const next = jest.fn();
    middleware.use({} as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not modify the request object', () => {
    const req = { user: mockUser } as never;
    const next = jest.fn();
    middleware.use(req, {} as never, next);
    expect((req as unknown as { user: LoggedInUser }).user).toEqual(mockUser);
  });

  it('calls next() even when request has no user', () => {
    const next = jest.fn();
    middleware.use({ headers: {} } as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

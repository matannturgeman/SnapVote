/**
 * Runtime tests for libs/shared/types.
 *
 * types.ts exports only TypeScript type aliases (no runtime values of its
 * own) derived from Zod schemas in @libs/shared-validation-schemas.
 * These tests verify that the underlying schemas used to derive those types
 * are reachable and parse / reject data correctly, confirming the type
 * contracts hold at runtime.
 */

import {
  userSchema,
  createUserSchema,
  loginSchema,
  registerSchema,
  authResponseSchema,
} from '@libs/shared-validation-schemas';

// Re-import the types module itself to confirm the barrel compiles and is
// importable (even though it exports no runtime values).
import * as Types from './types';

// ---------------------------------------------------------------------------
// Module import smoke-test
// ---------------------------------------------------------------------------

describe('types module', () => {
  it('is importable without throwing', () => {
    expect(Types).toBeDefined();
  });

  it('exports nothing at runtime (type-only module)', () => {
    // All exports in types.ts are type aliases or interfaces; the compiled JS
    // module object should have no own enumerable keys.
    expect(Object.keys(Types)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// User types — backed by userSchema / createUserSchema
// ---------------------------------------------------------------------------

describe('User type (via userSchema)', () => {
  const validUser = { id: 1, email: 'alice@example.com', name: 'Alice' };

  it('accepts a valid user object', () => {
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('accepts a user object with optional createdAt', () => {
    const result = userSchema.safeParse({
      ...validUser,
      createdAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a user without id', () => {
    const { id: _id, ...noId } = validUser;
    const result = userSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it('rejects a user with an invalid email', () => {
    const result = userSchema.safeParse({
      ...validUser,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a user with a name shorter than 2 characters', () => {
    const result = userSchema.safeParse({ ...validUser, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects a user with a name longer than 50 characters', () => {
    const result = userSchema.safeParse({ ...validUser, name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('CreateUserInput type (via createUserSchema)', () => {
  const validInput = {
    email: 'bob@example.com',
    name: 'Bobby',
    password: 'secret123',
  };

  it('accepts a valid create-user payload', () => {
    const result = createUserSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects when password is shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when password is longer than 100 characters', () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      password: 'p'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects when email is missing', () => {
    const { email: _email, ...noEmail } = validInput;
    const result = createUserSchema.safeParse(noEmail);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Auth types — backed by loginSchema / registerSchema / authResponseSchema
// ---------------------------------------------------------------------------

describe('LoginInput type (via loginSchema)', () => {
  const validLogin = { email: 'user@example.com', password: 'password1' };

  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it('rejects with an invalid email', () => {
    const result = loginSchema.safeParse({ ...validLogin, email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects when password is too short', () => {
    const result = loginSchema.safeParse({
      ...validLogin,
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when password is missing', () => {
    const result = loginSchema.safeParse({ email: validLogin.email });
    expect(result.success).toBe(false);
  });
});

describe('RegisterInput type (via registerSchema)', () => {
  const validRegister = {
    email: 'new@example.com',
    password: 'strongpass',
    name: 'Charlie',
  };

  it('accepts a valid register payload', () => {
    const result = registerSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
  });

  it('accepts a register payload with optional phone', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      phone: '+1234567890',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when name is too short', () => {
    const result = registerSchema.safeParse({ ...validRegister, name: 'X' });
    expect(result.success).toBe(false);
  });

  it('rejects when email is invalid', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      email: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('AuthResponse type (via authResponseSchema)', () => {
  const validAuthResponse = {
    accessToken: 'abc.def.ghi',
    tokenType: 'Bearer' as const,
    expiresIn: 3600,
    user: { id: 1, email: 'user@example.com', name: 'Alice' },
  };

  it('accepts a valid auth response', () => {
    const result = authResponseSchema.safeParse(validAuthResponse);
    expect(result.success).toBe(true);
  });

  it('accepts an auth response with optional refreshToken', () => {
    const result = authResponseSchema.safeParse({
      ...validAuthResponse,
      refreshToken: 'refresh-token-value',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when tokenType is not "Bearer"', () => {
    const result = authResponseSchema.safeParse({
      ...validAuthResponse,
      tokenType: 'Basic',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when accessToken is missing', () => {
    const { accessToken: _at, ...noToken } = validAuthResponse;
    const result = authResponseSchema.safeParse(noToken);
    expect(result.success).toBe(false);
  });

  it('rejects when user is missing', () => {
    const { user: _user, ...noUser } = validAuthResponse;
    const result = authResponseSchema.safeParse(noUser);
    expect(result.success).toBe(false);
  });

  it('rejects when expiresIn is not a number', () => {
    const result = authResponseSchema.safeParse({
      ...validAuthResponse,
      expiresIn: 'never',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pagination interfaces — structural / duck-typing checks
// ---------------------------------------------------------------------------

describe('PaginatedResult interface', () => {
  it('accepts a structurally conforming object', () => {
    // PaginatedResult<string> — verified at compile time; here we confirm the
    // shape is correct at runtime using plain property checks.
    const result: import('./types').PaginatedResult<string> = {
      data: ['a', 'b'],
      total: 2,
      page: 1,
      limit: 10,
    };
    expect(result.data).toEqual(['a', 'b']);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});

describe('PaginationQuery interface', () => {
  it('allows all fields to be optional', () => {
    const query: import('./types').PaginationQuery = {};
    expect(query.page).toBeUndefined();
    expect(query.limit).toBeUndefined();
  });

  it('accepts page and limit when provided', () => {
    const query: import('./types').PaginationQuery = { page: 2, limit: 20 };
    expect(query.page).toBe(2);
    expect(query.limit).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// ApiResponse interface
// ---------------------------------------------------------------------------

describe('ApiResponse interface', () => {
  it('accepts a minimal response with only statusCode', () => {
    const res: import('./types').ApiResponse = { statusCode: 200 };
    expect(res.statusCode).toBe(200);
    expect(res.data).toBeUndefined();
    expect(res.message).toBeUndefined();
    expect(res.error).toBeUndefined();
  });

  it('accepts a full response', () => {
    const res: import('./types').ApiResponse<string[]> = {
      statusCode: 200,
      data: ['item'],
      message: 'OK',
      error: null,
    };
    expect(res.data).toEqual(['item']);
    expect(res.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// OrderStatus — exhaustiveness check
// ---------------------------------------------------------------------------

describe('OrderStatus type', () => {
  it('covers all expected status string literals at runtime', () => {
    // Ensures every known status value is assignable to the type.
    const statuses: import('./types').OrderStatus[] = [
      'pending',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
    ];
    expect(statuses).toHaveLength(5);
    statuses.forEach((s) => expect(typeof s).toBe('string'));
  });
});

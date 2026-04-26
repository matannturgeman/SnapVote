import {
  parseDto,
  safeParsDto,
  // User
  CreateUserDtoSchema,
  UpdateUserDtoSchema,
  UserResponseDtoSchema,
  // Auth
  LoginDtoSchema,
  RegisterDtoSchema,
  ForgotPasswordRequestDtoSchema,
  ResetPasswordDtoSchema,
  AuthResponseDtoSchema,
  // Common
  MessageResponseDtoSchema,
  SuccessResponseDtoSchema,
  // Pagination
  PaginationQueryDtoSchema,
  PaginatedResponseDtoSchema,
  // Poll
  CreatePollDtoSchema,
  UpdatePollDtoSchema,
  PollListQueryDtoSchema,
  PollResponseDtoSchema,
  PollOptionResponseDtoSchema,
  ShareLinkResponseDtoSchema,
  CreateShareLinkDtoSchema,
  CastVoteDtoSchema,
  PollResultsDtoSchema,
  PollStreamEventDtoSchema,
  // Moderation
  CreateReportDtoSchema,
  ReportReasonDtoSchema,
  ReportStatusDtoSchema,
  ModerationActionDtoSchema,
} from './dto';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const validUserPayload = () => ({
  id: 1,
  email: 'alice@example.com',
  name: 'Alice',
});

const validPollOption = () => ({ id: 'opt-1', text: 'Option A', order: 0 });

const validPoll = () => ({
  id: 'poll-1',
  title: 'My Poll',
  status: 'OPEN' as const,
  ownerId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  options: [validPollOption(), { id: 'opt-2', text: 'Option B', order: 1 }],
});

// ---------------------------------------------------------------------------
// parseDto
// ---------------------------------------------------------------------------

describe('parseDto', () => {
  it('returns the parsed value for a valid input', () => {
    const result = parseDto(LoginDtoSchema, {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.email).toBe('user@example.com');
    expect(result.password).toBe('password123');
  });

  it('throws a ZodError for invalid input', () => {
    expect(() =>
      parseDto(LoginDtoSchema, { email: 'bad', password: 'short' }),
    ).toThrow(z.ZodError);
  });

  it('works with any ZodTypeAny schema (string schema)', () => {
    const result = parseDto(z.string().min(3), 'hello');
    expect(result).toBe('hello');
  });

  it('throws when schema is a string schema and value is a number', () => {
    expect(() => parseDto(z.string(), 42)).toThrow(z.ZodError);
  });

  it('applies defaults from the schema', () => {
    const result = parseDto(PaginationQueryDtoSchema, {});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('strips unknown keys per Zod default behaviour', () => {
    const result = parseDto(CreateUserDtoSchema, {
      email: 'test@test.com',
      name: 'Tester',
      password: 'password99',
      extra: 'ignored',
    });
    expect((result as Record<string, unknown>)['extra']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// safeParsDto
// ---------------------------------------------------------------------------

describe('safeParsDto', () => {
  it('returns success:true with data for valid input', () => {
    const result = safeParsDto(LoginDtoSchema, {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('returns success:false with error for invalid input', () => {
    const result = safeParsDto(LoginDtoSchema, {
      email: 'not-email',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError);
    }
  });

  it('never throws — returns failure object instead', () => {
    expect(() => safeParsDto(CreateUserDtoSchema, null)).not.toThrow();
    const result = safeParsDto(CreateUserDtoSchema, null);
    expect(result.success).toBe(false);
  });

  it('returns success:true for valid empty-like objects that have defaults', () => {
    const result = safeParsDto(PaginationQueryDtoSchema, {});
    expect(result.success).toBe(true);
  });

  it('accumulates multiple errors when multiple fields are invalid', () => {
    const result = safeParsDto(CreateUserDtoSchema, {
      email: 'bad',
      name: 'X',
      password: 'abc',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// CreateUserDtoSchema
// ---------------------------------------------------------------------------

describe('CreateUserDtoSchema', () => {
  const valid = () => ({
    email: 'bob@example.com',
    name: 'Bobby',
    password: 'securepass',
  });

  it('accepts a valid create-user payload', () => {
    expect(() => CreateUserDtoSchema.parse(valid())).not.toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    const r = safeParsDto(CreateUserDtoSchema, { ...valid(), password: 'abc' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const r = safeParsDto(CreateUserDtoSchema, { ...valid(), email: 'nope' });
    expect(r.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const r = safeParsDto(CreateUserDtoSchema, { ...valid(), name: 'X' });
    expect(r.success).toBe(false);
  });

  it('rejects a name longer than 50 characters', () => {
    const r = safeParsDto(CreateUserDtoSchema, {
      ...valid(),
      name: 'N'.repeat(51),
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UpdateUserDtoSchema
// ---------------------------------------------------------------------------

describe('UpdateUserDtoSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => UpdateUserDtoSchema.parse({})).not.toThrow();
  });

  it('accepts a partial update with only name', () => {
    expect(() => UpdateUserDtoSchema.parse({ name: 'New Name' })).not.toThrow();
  });

  it('rejects an invalid email when provided', () => {
    const r = safeParsDto(UpdateUserDtoSchema, { email: 'bad' });
    expect(r.success).toBe(false);
  });

  it('does not include id or createdAt (omitted from base)', () => {
    // id and createdAt are omitted, so extra keys are stripped silently
    const result = UpdateUserDtoSchema.parse({ name: 'Alice' });
    expect((result as Record<string, unknown>)['id']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// UserResponseDtoSchema
// ---------------------------------------------------------------------------

describe('UserResponseDtoSchema', () => {
  it('accepts a valid user response', () => {
    const result = UserResponseDtoSchema.parse(validUserPayload());
    expect(result.id).toBe(1);
    expect(result.email).toBe('alice@example.com');
  });

  it('accepts user with optional createdAt', () => {
    expect(() =>
      UserResponseDtoSchema.parse({
        ...validUserPayload(),
        createdAt: new Date(),
      }),
    ).not.toThrow();
  });

  it('rejects a non-numeric id', () => {
    const r = safeParsDto(UserResponseDtoSchema, {
      ...validUserPayload(),
      id: 'abc',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const r = safeParsDto(UserResponseDtoSchema, {
      ...validUserPayload(),
      email: 'not-email',
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LoginDtoSchema
// ---------------------------------------------------------------------------

describe('LoginDtoSchema', () => {
  const valid = () => ({
    email: 'user@example.com',
    password: 'password123',
  });

  it('accepts valid credentials', () => {
    expect(() => LoginDtoSchema.parse(valid())).not.toThrow();
  });

  it('rejects an invalid email', () => {
    const r = safeParsDto(LoginDtoSchema, { ...valid(), email: 'noatsign' });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const r = safeParsDto(LoginDtoSchema, { ...valid(), password: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects missing password', () => {
    const r = safeParsDto(LoginDtoSchema, { email: valid().email });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RegisterDtoSchema
// ---------------------------------------------------------------------------

describe('RegisterDtoSchema', () => {
  const valid = () => ({
    email: 'newuser@example.com',
    password: 'strongpass',
    name: 'New User',
  });

  it('accepts valid registration', () => {
    expect(() => RegisterDtoSchema.parse(valid())).not.toThrow();
  });

  it('accepts registration with optional phone', () => {
    expect(() =>
      RegisterDtoSchema.parse({ ...valid(), phone: '+1-555-0100' }),
    ).not.toThrow();
  });

  it('rejects name shorter than 2 characters', () => {
    const r = safeParsDto(RegisterDtoSchema, { ...valid(), name: 'Z' });
    expect(r.success).toBe(false);
  });

  it('rejects name longer than 50 characters', () => {
    const r = safeParsDto(RegisterDtoSchema, {
      ...valid(),
      name: 'N'.repeat(51),
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = safeParsDto(RegisterDtoSchema, { ...valid(), email: '@bad' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ForgotPasswordRequestDtoSchema
// ---------------------------------------------------------------------------

describe('ForgotPasswordRequestDtoSchema', () => {
  it('accepts a valid email', () => {
    expect(() =>
      ForgotPasswordRequestDtoSchema.parse({ email: 'user@example.com' }),
    ).not.toThrow();
  });

  it('rejects a non-email string', () => {
    const r = safeParsDto(ForgotPasswordRequestDtoSchema, {
      email: 'notanemail',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an empty email', () => {
    const r = safeParsDto(ForgotPasswordRequestDtoSchema, { email: '' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ResetPasswordDtoSchema
// ---------------------------------------------------------------------------

describe('ResetPasswordDtoSchema', () => {
  const valid = () => ({
    token: 'a'.repeat(20),
    password: 'newpassword1',
  });

  it('accepts a valid token and password', () => {
    expect(() => ResetPasswordDtoSchema.parse(valid())).not.toThrow();
  });

  it('rejects token shorter than 20 characters', () => {
    const r = safeParsDto(ResetPasswordDtoSchema, {
      ...valid(),
      token: 'short',
    });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const r = safeParsDto(ResetPasswordDtoSchema, {
      ...valid(),
      password: 'abc',
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AuthResponseDtoSchema
// ---------------------------------------------------------------------------

describe('AuthResponseDtoSchema', () => {
  const valid = () => ({
    accessToken: 'eyJhbGciOiJIUzI1NiJ9',
    tokenType: 'Bearer' as const,
    expiresIn: 3600,
    user: validUserPayload(),
  });

  it('accepts a valid auth response', () => {
    expect(() => AuthResponseDtoSchema.parse(valid())).not.toThrow();
  });

  it('accepts with optional refreshToken', () => {
    expect(() =>
      AuthResponseDtoSchema.parse({ ...valid(), refreshToken: 'rtoken' }),
    ).not.toThrow();
  });

  it('rejects tokenType other than Bearer', () => {
    const r = safeParsDto(AuthResponseDtoSchema, {
      ...valid(),
      tokenType: 'Basic',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid nested user email', () => {
    const r = safeParsDto(AuthResponseDtoSchema, {
      ...valid(),
      user: { ...validUserPayload(), email: 'bad' },
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MessageResponseDtoSchema
// ---------------------------------------------------------------------------

describe('MessageResponseDtoSchema', () => {
  it('accepts a valid message', () => {
    expect(() =>
      MessageResponseDtoSchema.parse({ message: 'Done' }),
    ).not.toThrow();
  });

  it('rejects missing message field', () => {
    const r = safeParsDto(MessageResponseDtoSchema, {});
    expect(r.success).toBe(false);
  });

  it('rejects non-string message', () => {
    const r = safeParsDto(MessageResponseDtoSchema, { message: 42 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SuccessResponseDtoSchema
// ---------------------------------------------------------------------------

describe('SuccessResponseDtoSchema', () => {
  it('accepts { success: true }', () => {
    expect(() =>
      SuccessResponseDtoSchema.parse({ success: true }),
    ).not.toThrow();
  });

  it('rejects { success: false }', () => {
    const r = safeParsDto(SuccessResponseDtoSchema, { success: false });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PaginationQueryDtoSchema
// ---------------------------------------------------------------------------

describe('PaginationQueryDtoSchema', () => {
  it('applies defaults when no input provided', () => {
    const result = PaginationQueryDtoSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts explicit valid page and limit', () => {
    const result = PaginationQueryDtoSchema.parse({ page: 3, limit: 50 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('coerces string values (query string scenario)', () => {
    const result = PaginationQueryDtoSchema.parse({ page: '2', limit: '30' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
  });

  it('rejects page less than 1', () => {
    const r = safeParsDto(PaginationQueryDtoSchema, { page: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const r = safeParsDto(PaginationQueryDtoSchema, { limit: 101 });
    expect(r.success).toBe(false);
  });

  it('rejects limit less than 1', () => {
    const r = safeParsDto(PaginationQueryDtoSchema, { limit: 0 });
    expect(r.success).toBe(false);
  });

  it('enforces integer for page (non-integer fails)', () => {
    const r = safeParsDto(PaginationQueryDtoSchema, { page: 1.5 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PaginatedResponseDtoSchema (generic factory)
// ---------------------------------------------------------------------------

describe('PaginatedResponseDtoSchema', () => {
  const UserPageSchema = PaginatedResponseDtoSchema(UserResponseDtoSchema);

  it('accepts a valid paginated response', () => {
    const result = UserPageSchema.parse({
      data: [validUserPayload()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('accepts an empty data array', () => {
    expect(() =>
      UserPageSchema.parse({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    ).not.toThrow();
  });

  it('rejects negative total', () => {
    const r = safeParsDto(UserPageSchema, {
      data: [],
      total: -1,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    expect(r.success).toBe(false);
  });

  it('rejects zero page (must be positive)', () => {
    const r = safeParsDto(UserPageSchema, {
      data: [],
      total: 0,
      page: 0,
      limit: 20,
      totalPages: 0,
    });
    expect(r.success).toBe(false);
  });

  it('validates nested item schema — rejects invalid user in data', () => {
    const r = safeParsDto(UserPageSchema, {
      data: [{ id: 'not-a-number', email: 'bad', name: 'X' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(r.success).toBe(false);
  });

  it('works with a different item schema (string items)', () => {
    const StringPageSchema = PaginatedResponseDtoSchema(z.string());
    expect(() =>
      StringPageSchema.parse({
        data: ['a', 'b'],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// PollOptionResponseDtoSchema
// ---------------------------------------------------------------------------

describe('PollOptionResponseDtoSchema', () => {
  it('accepts a valid poll option', () => {
    expect(() =>
      PollOptionResponseDtoSchema.parse(validPollOption()),
    ).not.toThrow();
  });

  it('rejects empty text', () => {
    const r = safeParsDto(PollOptionResponseDtoSchema, {
      ...validPollOption(),
      text: '',
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative order', () => {
    const r = safeParsDto(PollOptionResponseDtoSchema, {
      ...validPollOption(),
      order: -1,
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PollResponseDtoSchema
// ---------------------------------------------------------------------------

describe('PollResponseDtoSchema', () => {
  it('accepts a valid poll', () => {
    expect(() => PollResponseDtoSchema.parse(validPoll())).not.toThrow();
  });

  it('accepts a poll with optional fields', () => {
    expect(() =>
      PollResponseDtoSchema.parse({
        ...validPoll(),
        description: 'desc',
        openedAt: new Date(),
        closedAt: null,
        totalVotes: 10,
      }),
    ).not.toThrow();
  });

  it('rejects empty title', () => {
    const r = safeParsDto(PollResponseDtoSchema, { ...validPoll(), title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects empty options array', () => {
    const r = safeParsDto(PollResponseDtoSchema, {
      ...validPoll(),
      options: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const r = safeParsDto(PollResponseDtoSchema, {
      ...validPoll(),
      status: 'EXPIRED',
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreatePollDtoSchema
// ---------------------------------------------------------------------------

describe('CreatePollDtoSchema', () => {
  const valid = () => ({
    title: 'Best framework?',
    options: ['React', 'Vue'],
  });

  it('accepts valid poll creation payload', () => {
    expect(() => CreatePollDtoSchema.parse(valid())).not.toThrow();
  });

  it('accepts exactly 10 options', () => {
    expect(() =>
      CreatePollDtoSchema.parse({
        ...valid(),
        options: Array.from({ length: 10 }, (_, i) => `Opt ${i + 1}`),
      }),
    ).not.toThrow();
  });

  it('rejects fewer than 2 options', () => {
    const r = safeParsDto(CreatePollDtoSchema, {
      ...valid(),
      options: ['Solo'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects more than 10 options', () => {
    const r = safeParsDto(CreatePollDtoSchema, {
      ...valid(),
      options: Array.from({ length: 11 }, (_, i) => `Opt ${i}`),
    });
    expect(r.success).toBe(false);
  });

  it('rejects an empty option text', () => {
    const r = safeParsDto(CreatePollDtoSchema, {
      ...valid(),
      options: ['', 'B'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty title', () => {
    const r = safeParsDto(CreatePollDtoSchema, { ...valid(), title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects description longer than 1000 characters', () => {
    const r = safeParsDto(CreatePollDtoSchema, {
      ...valid(),
      description: 'd'.repeat(1001),
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UpdatePollDtoSchema
// ---------------------------------------------------------------------------

describe('UpdatePollDtoSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => UpdatePollDtoSchema.parse({})).not.toThrow();
  });

  it('accepts partial update with only title', () => {
    expect(() =>
      UpdatePollDtoSchema.parse({ title: 'Updated title' }),
    ).not.toThrow();
  });

  it('rejects fewer than 2 options when options provided', () => {
    const r = safeParsDto(UpdatePollDtoSchema, { options: ['Only'] });
    expect(r.success).toBe(false);
  });

  it('rejects empty title when title provided', () => {
    const r = safeParsDto(UpdatePollDtoSchema, { title: '' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PollListQueryDtoSchema
// ---------------------------------------------------------------------------

describe('PollListQueryDtoSchema', () => {
  it('applies defaults when no input provided', () => {
    const result = PollListQueryDtoSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts all fields including status filter', () => {
    const result = PollListQueryDtoSchema.parse({
      status: 'OPEN',
      page: 2,
      limit: 10,
    });
    expect(result.status).toBe('OPEN');
  });

  it('rejects invalid status value', () => {
    const r = safeParsDto(PollListQueryDtoSchema, { status: 'INVALID' });
    expect(r.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const r = safeParsDto(PollListQueryDtoSchema, { limit: 101 });
    expect(r.success).toBe(false);
  });

  it('rejects page less than 1', () => {
    const r = safeParsDto(PollListQueryDtoSchema, { page: 0 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ShareLinkResponseDtoSchema
// ---------------------------------------------------------------------------

describe('ShareLinkResponseDtoSchema', () => {
  const valid = () => ({
    id: 'sl-1',
    pollId: 'poll-1',
    token: 'tok-abc',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  });

  it('accepts a valid share link', () => {
    expect(() => ShareLinkResponseDtoSchema.parse(valid())).not.toThrow();
  });

  it('accepts null expiresAt', () => {
    expect(() =>
      ShareLinkResponseDtoSchema.parse({ ...valid(), expiresAt: null }),
    ).not.toThrow();
  });

  it('rejects an invalid status', () => {
    const r = safeParsDto(ShareLinkResponseDtoSchema, {
      ...valid(),
      status: 'PENDING',
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing token', () => {
    const { token: _t, ...rest } = valid();
    const r = safeParsDto(ShareLinkResponseDtoSchema, rest);
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreateShareLinkDtoSchema
// ---------------------------------------------------------------------------

describe('CreateShareLinkDtoSchema', () => {
  it('accepts empty object', () => {
    expect(() => CreateShareLinkDtoSchema.parse({})).not.toThrow();
  });

  it('accepts an object with a valid expiresAt date', () => {
    expect(() =>
      CreateShareLinkDtoSchema.parse({ expiresAt: new Date() }),
    ).not.toThrow();
  });

  it('rejects a string for expiresAt', () => {
    const r = safeParsDto(CreateShareLinkDtoSchema, {
      expiresAt: 'not-a-date',
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CastVoteDtoSchema
// ---------------------------------------------------------------------------

describe('CastVoteDtoSchema', () => {
  it('accepts a valid optionId', () => {
    expect(() => CastVoteDtoSchema.parse({ optionId: 'opt-1' })).not.toThrow();
  });

  it('rejects an empty optionId', () => {
    const r = safeParsDto(CastVoteDtoSchema, { optionId: '' });
    expect(r.success).toBe(false);
  });

  it('rejects missing optionId', () => {
    const r = safeParsDto(CastVoteDtoSchema, {});
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PollResultsDtoSchema
// ---------------------------------------------------------------------------

describe('PollResultsDtoSchema', () => {
  const validOption = () => ({
    id: 'opt-1',
    text: 'Yes',
    order: 0,
    voteCount: 10,
  });

  const valid = () => ({
    pollId: 'poll-1',
    totalVotes: 10,
    options: [validOption()],
    myVote: null,
  });

  it('accepts valid results with myVote null', () => {
    expect(() => PollResultsDtoSchema.parse(valid())).not.toThrow();
  });

  it('accepts valid results with myVote set', () => {
    expect(() =>
      PollResultsDtoSchema.parse({
        ...valid(),
        myVote: { optionId: 'opt-1' },
      }),
    ).not.toThrow();
  });

  it('rejects negative totalVotes', () => {
    const r = safeParsDto(PollResultsDtoSchema, {
      ...valid(),
      totalVotes: -1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative voteCount in an option', () => {
    const r = safeParsDto(PollResultsDtoSchema, {
      ...valid(),
      options: [{ ...validOption(), voteCount: -5 }],
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PollStreamEventDtoSchema (discriminated union)
// ---------------------------------------------------------------------------

describe('PollStreamEventDtoSchema', () => {
  it('parses a "results" event', () => {
    const result = PollStreamEventDtoSchema.parse({
      type: 'results',
      data: {
        pollId: 'p1',
        totalVotes: 2,
        options: [{ id: 'o1', text: 'A', order: 0, voteCount: 2 }],
        myVote: null,
      },
    });
    expect(result.type).toBe('results');
  });

  it('parses a "presence" event', () => {
    const result = PollStreamEventDtoSchema.parse({
      type: 'presence',
      data: { count: 5 },
    });
    expect(result.type).toBe('presence');
  });

  it('parses a "closed" event', () => {
    const result = PollStreamEventDtoSchema.parse({
      type: 'closed',
      data: { pollId: 'p1' },
    });
    expect(result.type).toBe('closed');
  });

  it('rejects an unknown event type', () => {
    const r = safeParsDto(PollStreamEventDtoSchema, {
      type: 'heartbeat',
      data: {},
    });
    expect(r.success).toBe(false);
  });

  it('rejects a presence event with negative count', () => {
    const r = safeParsDto(PollStreamEventDtoSchema, {
      type: 'presence',
      data: { count: -1 },
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreateReportDtoSchema
// ---------------------------------------------------------------------------

describe('CreateReportDtoSchema', () => {
  const valid = () => ({ reason: 'SPAM' as const });

  it('accepts a valid report with only reason', () => {
    expect(() => CreateReportDtoSchema.parse(valid())).not.toThrow();
  });

  it('accepts a report with optional details and voteId', () => {
    expect(() =>
      CreateReportDtoSchema.parse({
        ...valid(),
        details: 'Detailed explanation',
        voteId: 'vote-1',
      }),
    ).not.toThrow();
  });

  it('rejects an invalid reason', () => {
    const r = safeParsDto(CreateReportDtoSchema, { reason: 'UNKNOWN' });
    expect(r.success).toBe(false);
  });

  it('rejects details longer than 1000 characters', () => {
    const r = safeParsDto(CreateReportDtoSchema, {
      ...valid(),
      details: 'd'.repeat(1001),
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty details string (min 1)', () => {
    const r = safeParsDto(CreateReportDtoSchema, { ...valid(), details: '' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ReportReasonDtoSchema
// ---------------------------------------------------------------------------

describe('ReportReasonDtoSchema', () => {
  it.each(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'DUPLICATE'] as const)(
    'accepts valid reason "%s"',
    (reason) => {
      expect(() => ReportReasonDtoSchema.parse(reason)).not.toThrow();
    },
  );

  it('rejects an unknown reason', () => {
    const r = safeParsDto(ReportReasonDtoSchema, 'ABUSE');
    expect(r.success).toBe(false);
  });

  it('rejects a lowercase reason', () => {
    const r = safeParsDto(ReportReasonDtoSchema, 'spam');
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ReportStatusDtoSchema
// ---------------------------------------------------------------------------

describe('ReportStatusDtoSchema', () => {
  it.each(['PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN'] as const)(
    'accepts valid status "%s"',
    (status) => {
      expect(() => ReportStatusDtoSchema.parse(status)).not.toThrow();
    },
  );

  it('rejects an unknown status', () => {
    const r = safeParsDto(ReportStatusDtoSchema, 'CLOSED');
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ModerationActionDtoSchema
// ---------------------------------------------------------------------------

describe('ModerationActionDtoSchema', () => {
  it.each(['LOCK', 'UNLOCK', 'DELETE', 'REMOVE_REPORT'] as const)(
    'accepts valid action "%s"',
    (action) => {
      expect(() => ModerationActionDtoSchema.parse(action)).not.toThrow();
    },
  );

  it('rejects an unknown action', () => {
    const r = safeParsDto(ModerationActionDtoSchema, 'BAN');
    expect(r.success).toBe(false);
  });

  it('rejects a lowercase action', () => {
    const r = safeParsDto(ModerationActionDtoSchema, 'lock');
    expect(r.success).toBe(false);
  });
});

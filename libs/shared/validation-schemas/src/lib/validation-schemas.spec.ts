import {
  userSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  registerSchema,
  forgotPasswordRequestSchema,
  resetPasswordSchema,
  authResponseSchema,
  refreshTokenSchema,
  paginationQuerySchema,
  messageResponseSchema,
  successResponseSchema,
  errorResponseSchema,
  pollStatusSchema,
  pollOptionSchema,
  pollSchema,
  pollListQuerySchema,
  createPollSchema,
  updatePollSchema,
  shareLinkStatusSchema,
  shareLinkSchema,
  createShareLinkSchema,
  castVoteSchema,
  voteOptionResultSchema,
  pollResultsSchema,
  pollStreamResultsEventSchema,
  pollStreamPresenceEventSchema,
  pollStreamClosedEventSchema,
  pollStreamEventSchema,
  reportReasonSchema,
  reportStatusSchema,
  createReportSchema,
  moderationActionSchema,
} from './validation-schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validUser = () => ({
  id: 1,
  email: 'alice@example.com',
  name: 'Alice',
});

const validPollOption = () => ({
  id: 'opt-1',
  text: 'Option A',
  order: 0,
});

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
// userSchema
// ---------------------------------------------------------------------------

describe('userSchema', () => {
  it('accepts a minimal valid user', () => {
    expect(() => userSchema.parse(validUser())).not.toThrow();
  });

  it('accepts a user with optional createdAt', () => {
    const result = userSchema.parse({ ...validUser(), createdAt: new Date() });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a non-numeric id', () => {
    const r = userSchema.safeParse({ ...validUser(), id: 'abc' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const r = userSchema.safeParse({ ...validUser(), email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const r = userSchema.safeParse({ ...validUser(), name: 'A' });
    expect(r.success).toBe(false);
  });

  it('rejects a name longer than 50 characters', () => {
    const r = userSchema.safeParse({ ...validUser(), name: 'A'.repeat(51) });
    expect(r.success).toBe(false);
  });

  it('rejects a missing email', () => {
    const { email: _email, ...rest } = validUser();
    const r = userSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createUserSchema
// ---------------------------------------------------------------------------

describe('createUserSchema', () => {
  const valid = () => ({
    email: 'bob@example.com',
    name: 'Bobby',
    password: 'securepassword',
  });

  it('accepts a valid create-user payload', () => {
    expect(() => createUserSchema.parse(valid())).not.toThrow();
  });

  it('accepts password at exactly 8 characters (boundary)', () => {
    expect(() =>
      createUserSchema.parse({ ...valid(), password: '12345678' }),
    ).not.toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    const r = createUserSchema.safeParse({ ...valid(), password: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects password longer than 100 characters', () => {
    const r = createUserSchema.safeParse({
      ...valid(),
      password: 'p'.repeat(101),
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _name, ...rest } = valid();
    const r = createUserSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const r = createUserSchema.safeParse({ ...valid(), name: 'X' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateUserSchema
// ---------------------------------------------------------------------------

describe('updateUserSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => updateUserSchema.parse({})).not.toThrow();
  });

  it('accepts a partial update with only email', () => {
    expect(() =>
      updateUserSchema.parse({ email: 'new@example.com' }),
    ).not.toThrow();
  });

  it('rejects an invalid email when provided', () => {
    const r = updateUserSchema.safeParse({ email: 'bad-email' });
    expect(r.success).toBe(false);
  });

  it('rejects a short password when provided', () => {
    const r = updateUserSchema.safeParse({ password: 'abc' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------

describe('loginSchema', () => {
  const valid = () => ({
    email: 'user@example.com',
    password: 'password123',
  });

  it('accepts valid credentials', () => {
    expect(() => loginSchema.parse(valid())).not.toThrow();
  });

  it('accepts minimum-length password (8 chars)', () => {
    expect(() =>
      loginSchema.parse({ ...valid(), password: '12345678' }),
    ).not.toThrow();
  });

  it('rejects an invalid email', () => {
    const r = loginSchema.safeParse({ ...valid(), email: 'noatsign' });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const r = loginSchema.safeParse({ ...valid(), password: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects missing password', () => {
    const r = loginSchema.safeParse({ email: valid().email });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------

describe('registerSchema', () => {
  const valid = () => ({
    email: 'newuser@example.com',
    password: 'strongpass',
    name: 'New User',
  });

  it('accepts valid registration without optional phone', () => {
    expect(() => registerSchema.parse(valid())).not.toThrow();
  });

  it('accepts registration with optional phone', () => {
    expect(() =>
      registerSchema.parse({ ...valid(), phone: '+1-555-0100' }),
    ).not.toThrow();
  });

  it('rejects invalid email', () => {
    const r = registerSchema.safeParse({ ...valid(), email: '@bad' });
    expect(r.success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const r = registerSchema.safeParse({ ...valid(), name: 'Z' });
    expect(r.success).toBe(false);
  });

  it('rejects name longer than 50 characters', () => {
    const r = registerSchema.safeParse({ ...valid(), name: 'N'.repeat(51) });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const r = registerSchema.safeParse({ ...valid(), password: 'abc123' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// forgotPasswordRequestSchema
// ---------------------------------------------------------------------------

describe('forgotPasswordRequestSchema', () => {
  it('accepts a valid email', () => {
    expect(() =>
      forgotPasswordRequestSchema.parse({ email: 'user@example.com' }),
    ).not.toThrow();
  });

  it('accepts another valid email format', () => {
    expect(() =>
      forgotPasswordRequestSchema.parse({ email: 'a.b+tag@sub.domain.org' }),
    ).not.toThrow();
  });

  it('rejects a non-email string', () => {
    const r = forgotPasswordRequestSchema.safeParse({ email: 'notanemail' });
    expect(r.success).toBe(false);
  });

  it('rejects an empty email', () => {
    const r = forgotPasswordRequestSchema.safeParse({ email: '' });
    expect(r.success).toBe(false);
  });

  it('rejects missing email field', () => {
    const r = forgotPasswordRequestSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resetPasswordSchema
// ---------------------------------------------------------------------------

describe('resetPasswordSchema', () => {
  const valid = () => ({
    token: 'a'.repeat(20),
    password: 'newpassword1',
  });

  it('accepts valid token and password', () => {
    expect(() => resetPasswordSchema.parse(valid())).not.toThrow();
  });

  it('accepts token longer than 20 characters', () => {
    expect(() =>
      resetPasswordSchema.parse({ ...valid(), token: 'x'.repeat(64) }),
    ).not.toThrow();
  });

  it('rejects token shorter than 20 characters', () => {
    const r = resetPasswordSchema.safeParse({ ...valid(), token: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const r = resetPasswordSchema.safeParse({ ...valid(), password: 'abc' });
    expect(r.success).toBe(false);
  });

  it('rejects password longer than 100 characters', () => {
    const r = resetPasswordSchema.safeParse({
      ...valid(),
      password: 'p'.repeat(101),
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// authResponseSchema
// ---------------------------------------------------------------------------

describe('authResponseSchema', () => {
  const valid = () => ({
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.token',
    tokenType: 'Bearer' as const,
    expiresIn: 3600,
    user: validUser(),
  });

  it('accepts a valid auth response without refreshToken', () => {
    expect(() => authResponseSchema.parse(valid())).not.toThrow();
  });

  it('accepts a valid auth response with refreshToken', () => {
    expect(() =>
      authResponseSchema.parse({ ...valid(), refreshToken: 'refresh-token' }),
    ).not.toThrow();
  });

  it('rejects tokenType other than Bearer', () => {
    const r = authResponseSchema.safeParse({ ...valid(), tokenType: 'Basic' });
    expect(r.success).toBe(false);
  });

  it('rejects missing accessToken', () => {
    const { accessToken: _at, ...rest } = valid();
    const r = authResponseSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rejects non-numeric expiresIn', () => {
    const r = authResponseSchema.safeParse({
      ...valid(),
      expiresIn: '3600',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid nested user', () => {
    const r = authResponseSchema.safeParse({
      ...valid(),
      user: { id: 1, email: 'bad-email', name: 'X' },
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// refreshTokenSchema
// ---------------------------------------------------------------------------

describe('refreshTokenSchema', () => {
  it('accepts a non-empty refresh token', () => {
    expect(() =>
      refreshTokenSchema.parse({ refreshToken: 'some-refresh-token' }),
    ).not.toThrow();
  });

  it('accepts an empty string (no min constraint)', () => {
    expect(() =>
      refreshTokenSchema.parse({ refreshToken: '' }),
    ).not.toThrow();
  });

  it('rejects missing refreshToken field', () => {
    const r = refreshTokenSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// paginationQuerySchema
// ---------------------------------------------------------------------------

describe('paginationQuerySchema', () => {
  it('accepts valid page and limit', () => {
    const result = paginationQuerySchema.parse({ page: 2, limit: 25 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
  });

  it('applies defaults when no values provided', () => {
    const result = paginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('coerces string numbers from query strings', () => {
    const result = paginationQuerySchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page less than 1', () => {
    const r = paginationQuerySchema.safeParse({ page: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const r = paginationQuerySchema.safeParse({ limit: 101 });
    expect(r.success).toBe(false);
  });

  it('rejects limit less than 1', () => {
    const r = paginationQuerySchema.safeParse({ limit: 0 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// messageResponseSchema
// ---------------------------------------------------------------------------

describe('messageResponseSchema', () => {
  it('accepts a non-empty message', () => {
    expect(() =>
      messageResponseSchema.parse({ message: 'Operation successful' }),
    ).not.toThrow();
  });

  it('accepts an empty string message (no min constraint)', () => {
    expect(() => messageResponseSchema.parse({ message: '' })).not.toThrow();
  });

  it('rejects missing message field', () => {
    const r = messageResponseSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('rejects non-string message', () => {
    const r = messageResponseSchema.safeParse({ message: 42 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// successResponseSchema
// ---------------------------------------------------------------------------

describe('successResponseSchema', () => {
  it('accepts { success: true }', () => {
    expect(() => successResponseSchema.parse({ success: true })).not.toThrow();
  });

  it('rejects { success: false }', () => {
    const r = successResponseSchema.safeParse({ success: false });
    expect(r.success).toBe(false);
  });

  it('rejects missing success field', () => {
    const r = successResponseSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// errorResponseSchema
// ---------------------------------------------------------------------------

describe('errorResponseSchema', () => {
  it('accepts a minimal error response', () => {
    expect(() =>
      errorResponseSchema.parse({ statusCode: 404, message: 'Not found' }),
    ).not.toThrow();
  });

  it('accepts an error response with optional error field', () => {
    expect(() =>
      errorResponseSchema.parse({
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      }),
    ).not.toThrow();
  });

  it('rejects non-numeric statusCode', () => {
    const r = errorResponseSchema.safeParse({
      statusCode: '404',
      message: 'Not found',
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing message', () => {
    const r = errorResponseSchema.safeParse({ statusCode: 400 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollStatusSchema
// ---------------------------------------------------------------------------

describe('pollStatusSchema', () => {
  it.each(['DRAFT', 'OPEN', 'CLOSED', 'LOCKED'] as const)(
    'accepts valid status "%s"',
    (status) => {
      expect(() => pollStatusSchema.parse(status)).not.toThrow();
    },
  );

  it('rejects an unknown status value', () => {
    const r = pollStatusSchema.safeParse('ARCHIVED');
    expect(r.success).toBe(false);
  });

  it('rejects a lowercase value', () => {
    const r = pollStatusSchema.safeParse('open');
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollOptionSchema
// ---------------------------------------------------------------------------

describe('pollOptionSchema', () => {
  it('accepts a valid poll option', () => {
    expect(() => pollOptionSchema.parse(validPollOption())).not.toThrow();
  });

  it('accepts option with order of 0 (nonnegative boundary)', () => {
    expect(() =>
      pollOptionSchema.parse({ id: 'o', text: 'Yes', order: 0 }),
    ).not.toThrow();
  });

  it('rejects empty text', () => {
    const r = pollOptionSchema.safeParse({ ...validPollOption(), text: '' });
    expect(r.success).toBe(false);
  });

  it('rejects text longer than 200 characters', () => {
    const r = pollOptionSchema.safeParse({
      ...validPollOption(),
      text: 'x'.repeat(201),
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative order', () => {
    const r = pollOptionSchema.safeParse({ ...validPollOption(), order: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer order', () => {
    const r = pollOptionSchema.safeParse({ ...validPollOption(), order: 1.5 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollSchema
// ---------------------------------------------------------------------------

describe('pollSchema', () => {
  it('accepts a valid poll with required fields', () => {
    expect(() => pollSchema.parse(validPoll())).not.toThrow();
  });

  it('accepts a poll with optional description, openedAt, closedAt, totalVotes', () => {
    expect(() =>
      pollSchema.parse({
        ...validPoll(),
        description: 'A description',
        openedAt: new Date(),
        closedAt: null,
        totalVotes: 5,
      }),
    ).not.toThrow();
  });

  it('accepts a poll with null openedAt', () => {
    expect(() =>
      pollSchema.parse({ ...validPoll(), openedAt: null }),
    ).not.toThrow();
  });

  it('rejects empty title', () => {
    const r = pollSchema.safeParse({ ...validPoll(), title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects title longer than 200 characters', () => {
    const r = pollSchema.safeParse({
      ...validPoll(),
      title: 'T'.repeat(201),
    });
    expect(r.success).toBe(false);
  });

  it('rejects description longer than 1000 characters', () => {
    const r = pollSchema.safeParse({
      ...validPoll(),
      description: 'd'.repeat(1001),
    });
    expect(r.success).toBe(false);
  });

  it('rejects options array with zero items', () => {
    const r = pollSchema.safeParse({ ...validPoll(), options: [] });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid status value', () => {
    const r = pollSchema.safeParse({ ...validPoll(), status: 'EXPIRED' });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer ownerId', () => {
    const r = pollSchema.safeParse({ ...validPoll(), ownerId: 1.5 });
    expect(r.success).toBe(false);
  });

  it('rejects negative totalVotes', () => {
    const r = pollSchema.safeParse({ ...validPoll(), totalVotes: -1 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollListQuerySchema
// ---------------------------------------------------------------------------

describe('pollListQuerySchema', () => {
  it('accepts empty object and applies defaults', () => {
    const result = pollListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts all fields including status and date filters', () => {
    const result = pollListQuerySchema.parse({
      status: 'OPEN',
      from: '2024-01-01',
      to: '2024-12-31',
      page: 2,
      limit: 50,
    });
    expect(result.status).toBe('OPEN');
    expect(result.page).toBe(2);
  });

  it('coerces string page and limit', () => {
    const result = pollListQuerySchema.parse({ page: '3', limit: '15' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(15);
  });

  it('rejects limit greater than 100', () => {
    const r = pollListQuerySchema.safeParse({ limit: 101 });
    expect(r.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const r = pollListQuerySchema.safeParse({ status: 'UNKNOWN' });
    expect(r.success).toBe(false);
  });

  it('rejects page less than 1', () => {
    const r = pollListQuerySchema.safeParse({ page: 0 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createPollSchema
// ---------------------------------------------------------------------------

describe('createPollSchema', () => {
  const valid = () => ({
    title: 'Best framework?',
    options: ['React', 'Vue'],
  });

  it('accepts a valid create-poll payload', () => {
    expect(() => createPollSchema.parse(valid())).not.toThrow();
  });

  it('accepts exactly 10 options (max boundary)', () => {
    expect(() =>
      createPollSchema.parse({
        ...valid(),
        options: Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`),
      }),
    ).not.toThrow();
  });

  it('accepts an optional description', () => {
    expect(() =>
      createPollSchema.parse({ ...valid(), description: 'Pick one' }),
    ).not.toThrow();
  });

  it('rejects empty title', () => {
    const r = createPollSchema.safeParse({ ...valid(), title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects title longer than 200 characters', () => {
    const r = createPollSchema.safeParse({
      ...valid(),
      title: 'T'.repeat(201),
    });
    expect(r.success).toBe(false);
  });

  it('rejects fewer than 2 options', () => {
    const r = createPollSchema.safeParse({ ...valid(), options: ['Only one'] });
    expect(r.success).toBe(false);
  });

  it('rejects more than 10 options', () => {
    const r = createPollSchema.safeParse({
      ...valid(),
      options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`),
    });
    expect(r.success).toBe(false);
  });

  it('rejects an option with empty text', () => {
    const r = createPollSchema.safeParse({ ...valid(), options: ['', 'B'] });
    expect(r.success).toBe(false);
  });

  it('rejects an option text longer than 200 characters', () => {
    const r = createPollSchema.safeParse({
      ...valid(),
      options: ['x'.repeat(201), 'B'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects description longer than 1000 characters', () => {
    const r = createPollSchema.safeParse({
      ...valid(),
      description: 'd'.repeat(1001),
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updatePollSchema
// ---------------------------------------------------------------------------

describe('updatePollSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => updatePollSchema.parse({})).not.toThrow();
  });

  it('accepts partial update with only title', () => {
    expect(() =>
      updatePollSchema.parse({ title: 'New title' }),
    ).not.toThrow();
  });

  it('accepts partial update with options array', () => {
    expect(() =>
      updatePollSchema.parse({ options: ['A', 'B', 'C'] }),
    ).not.toThrow();
  });

  it('rejects empty title when provided', () => {
    const r = updatePollSchema.safeParse({ title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects fewer than 2 options when options provided', () => {
    const r = updatePollSchema.safeParse({ options: ['Solo'] });
    expect(r.success).toBe(false);
  });

  it('rejects more than 10 options when options provided', () => {
    const r = updatePollSchema.safeParse({
      options: Array.from({ length: 11 }, (_, i) => `Opt ${i}`),
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shareLinkStatusSchema
// ---------------------------------------------------------------------------

describe('shareLinkStatusSchema', () => {
  it('accepts ACTIVE', () => {
    expect(() => shareLinkStatusSchema.parse('ACTIVE')).not.toThrow();
  });

  it('accepts REVOKED', () => {
    expect(() => shareLinkStatusSchema.parse('REVOKED')).not.toThrow();
  });

  it('rejects an unknown status', () => {
    const r = shareLinkStatusSchema.safeParse('EXPIRED');
    expect(r.success).toBe(false);
  });

  it('rejects a lowercase value', () => {
    const r = shareLinkStatusSchema.safeParse('active');
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shareLinkSchema
// ---------------------------------------------------------------------------

describe('shareLinkSchema', () => {
  const valid = () => ({
    id: 'sl-1',
    pollId: 'poll-1',
    token: 'tok-abc',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  });

  it('accepts a valid share link without expiresAt', () => {
    expect(() => shareLinkSchema.parse(valid())).not.toThrow();
  });

  it('accepts a valid share link with null expiresAt', () => {
    expect(() =>
      shareLinkSchema.parse({ ...valid(), expiresAt: null }),
    ).not.toThrow();
  });

  it('accepts a valid share link with a Date expiresAt', () => {
    expect(() =>
      shareLinkSchema.parse({ ...valid(), expiresAt: new Date() }),
    ).not.toThrow();
  });

  it('rejects an invalid status', () => {
    const r = shareLinkSchema.safeParse({ ...valid(), status: 'PENDING' });
    expect(r.success).toBe(false);
  });

  it('rejects missing pollId', () => {
    const { pollId: _p, ...rest } = valid();
    const r = shareLinkSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createShareLinkSchema
// ---------------------------------------------------------------------------

describe('createShareLinkSchema', () => {
  it('accepts an empty object (expiresAt optional)', () => {
    expect(() => createShareLinkSchema.parse({})).not.toThrow();
  });

  it('accepts an object with expiresAt', () => {
    expect(() =>
      createShareLinkSchema.parse({ expiresAt: new Date() }),
    ).not.toThrow();
  });

  it('rejects a non-date expiresAt', () => {
    const r = createShareLinkSchema.safeParse({ expiresAt: 'not-a-date' });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// castVoteSchema
// ---------------------------------------------------------------------------

describe('castVoteSchema', () => {
  it('accepts a valid optionId', () => {
    expect(() => castVoteSchema.parse({ optionId: 'opt-1' })).not.toThrow();
  });

  it('accepts a longer optionId string', () => {
    expect(() =>
      castVoteSchema.parse({ optionId: 'abc123def456' }),
    ).not.toThrow();
  });

  it('rejects an empty optionId', () => {
    const r = castVoteSchema.safeParse({ optionId: '' });
    expect(r.success).toBe(false);
  });

  it('rejects missing optionId', () => {
    const r = castVoteSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// voteOptionResultSchema
// ---------------------------------------------------------------------------

describe('voteOptionResultSchema', () => {
  const valid = () => ({
    id: 'opt-1',
    text: 'Option A',
    order: 0,
    voteCount: 42,
  });

  it('accepts a valid vote option result', () => {
    expect(() => voteOptionResultSchema.parse(valid())).not.toThrow();
  });

  it('accepts zero voteCount', () => {
    expect(() =>
      voteOptionResultSchema.parse({ ...valid(), voteCount: 0 }),
    ).not.toThrow();
  });

  it('rejects negative voteCount', () => {
    const r = voteOptionResultSchema.safeParse({ ...valid(), voteCount: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects negative order', () => {
    const r = voteOptionResultSchema.safeParse({ ...valid(), order: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer voteCount', () => {
    const r = voteOptionResultSchema.safeParse({ ...valid(), voteCount: 1.5 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollResultsSchema
// ---------------------------------------------------------------------------

describe('pollResultsSchema', () => {
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

  it('accepts valid results with null myVote', () => {
    expect(() => pollResultsSchema.parse(valid())).not.toThrow();
  });

  it('accepts valid results with a non-null myVote', () => {
    expect(() =>
      pollResultsSchema.parse({ ...valid(), myVote: { optionId: 'opt-1' } }),
    ).not.toThrow();
  });

  it('rejects negative totalVotes', () => {
    const r = pollResultsSchema.safeParse({ ...valid(), totalVotes: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer totalVotes', () => {
    const r = pollResultsSchema.safeParse({ ...valid(), totalVotes: 3.14 });
    expect(r.success).toBe(false);
  });

  it('rejects missing pollId', () => {
    const { pollId: _p, ...rest } = valid();
    const r = pollResultsSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollStreamResultsEventSchema
// ---------------------------------------------------------------------------

describe('pollStreamResultsEventSchema', () => {
  const validData = () => ({
    pollId: 'poll-1',
    totalVotes: 5,
    options: [{ id: 'o1', text: 'Yes', order: 0, voteCount: 5 }],
    myVote: null,
  });

  it('accepts a valid results event', () => {
    expect(() =>
      pollStreamResultsEventSchema.parse({ type: 'results', data: validData() }),
    ).not.toThrow();
  });

  it('rejects wrong type literal', () => {
    const r = pollStreamResultsEventSchema.safeParse({
      type: 'presence',
      data: validData(),
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollStreamPresenceEventSchema
// ---------------------------------------------------------------------------

describe('pollStreamPresenceEventSchema', () => {
  it('accepts a valid presence event', () => {
    expect(() =>
      pollStreamPresenceEventSchema.parse({
        type: 'presence',
        data: { count: 3 },
      }),
    ).not.toThrow();
  });

  it('accepts count of 0', () => {
    expect(() =>
      pollStreamPresenceEventSchema.parse({
        type: 'presence',
        data: { count: 0 },
      }),
    ).not.toThrow();
  });

  it('rejects negative count', () => {
    const r = pollStreamPresenceEventSchema.safeParse({
      type: 'presence',
      data: { count: -1 },
    });
    expect(r.success).toBe(false);
  });

  it('rejects wrong type literal', () => {
    const r = pollStreamPresenceEventSchema.safeParse({
      type: 'closed',
      data: { count: 1 },
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollStreamClosedEventSchema
// ---------------------------------------------------------------------------

describe('pollStreamClosedEventSchema', () => {
  it('accepts a valid closed event', () => {
    expect(() =>
      pollStreamClosedEventSchema.parse({
        type: 'closed',
        data: { pollId: 'poll-1' },
      }),
    ).not.toThrow();
  });

  it('rejects wrong type literal', () => {
    const r = pollStreamClosedEventSchema.safeParse({
      type: 'results',
      data: { pollId: 'poll-1' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing pollId in data', () => {
    const r = pollStreamClosedEventSchema.safeParse({
      type: 'closed',
      data: {},
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pollStreamEventSchema (discriminated union)
// ---------------------------------------------------------------------------

describe('pollStreamEventSchema', () => {
  it('discriminates correctly for type "results"', () => {
    const result = pollStreamEventSchema.parse({
      type: 'results',
      data: {
        pollId: 'p1',
        totalVotes: 0,
        options: [],
        myVote: null,
      },
    });
    expect(result.type).toBe('results');
  });

  it('discriminates correctly for type "presence"', () => {
    const result = pollStreamEventSchema.parse({
      type: 'presence',
      data: { count: 10 },
    });
    expect(result.type).toBe('presence');
  });

  it('discriminates correctly for type "closed"', () => {
    const result = pollStreamEventSchema.parse({
      type: 'closed',
      data: { pollId: 'p1' },
    });
    expect(result.type).toBe('closed');
  });

  it('rejects an unknown type', () => {
    const r = pollStreamEventSchema.safeParse({
      type: 'unknown',
      data: {},
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reportReasonSchema
// ---------------------------------------------------------------------------

describe('reportReasonSchema', () => {
  it.each(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'DUPLICATE'] as const)(
    'accepts valid reason "%s"',
    (reason) => {
      expect(() => reportReasonSchema.parse(reason)).not.toThrow();
    },
  );

  it('rejects an unknown reason', () => {
    const r = reportReasonSchema.safeParse('ABUSE');
    expect(r.success).toBe(false);
  });

  it('rejects a lowercase reason', () => {
    const r = reportReasonSchema.safeParse('spam');
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reportStatusSchema
// ---------------------------------------------------------------------------

describe('reportStatusSchema', () => {
  it.each(['PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN'] as const)(
    'accepts valid status "%s"',
    (status) => {
      expect(() => reportStatusSchema.parse(status)).not.toThrow();
    },
  );

  it('rejects an unknown status', () => {
    const r = reportStatusSchema.safeParse('CLOSED');
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createReportSchema
// ---------------------------------------------------------------------------

describe('createReportSchema', () => {
  const valid = () => ({ reason: 'SPAM' as const });

  it('accepts a valid report with only reason', () => {
    expect(() => createReportSchema.parse(valid())).not.toThrow();
  });

  it('accepts a report with optional details', () => {
    expect(() =>
      createReportSchema.parse({ ...valid(), details: 'This is spam content' }),
    ).not.toThrow();
  });

  it('accepts a report with optional voteId', () => {
    expect(() =>
      createReportSchema.parse({ ...valid(), voteId: 'vote-abc' }),
    ).not.toThrow();
  });

  it('rejects an invalid reason', () => {
    const r = createReportSchema.safeParse({ reason: 'ILLEGAL' });
    expect(r.success).toBe(false);
  });

  it('rejects details longer than 1000 characters', () => {
    const r = createReportSchema.safeParse({
      ...valid(),
      details: 'd'.repeat(1001),
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty details string (min 1)', () => {
    const r = createReportSchema.safeParse({ ...valid(), details: '' });
    expect(r.success).toBe(false);
  });

  it('rejects missing reason', () => {
    const r = createReportSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// moderationActionSchema
// ---------------------------------------------------------------------------

describe('moderationActionSchema', () => {
  it.each(['LOCK', 'UNLOCK', 'DELETE', 'REMOVE_REPORT'] as const)(
    'accepts valid action "%s"',
    (action) => {
      expect(() => moderationActionSchema.parse(action)).not.toThrow();
    },
  );

  it('rejects an unknown action', () => {
    const r = moderationActionSchema.safeParse('BAN');
    expect(r.success).toBe(false);
  });

  it('rejects a lowercase action', () => {
    const r = moderationActionSchema.safeParse('lock');
    expect(r.success).toBe(false);
  });
});

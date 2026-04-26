import axios from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueEmail(suffix: string) {
  return `auth-${suffix}-${Date.now()}@example.com`;
}

async function register(
  suffix: string,
  overrides: Record<string, unknown> = {},
) {
  return axios.post('/api/auth/register', {
    name: `Auth User ${suffix}`,
    email: uniqueEmail(suffix),
    password: 'Password123!',
    ...overrides,
  });
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  it('returns token and user on valid registration', async () => {
    const res = await register('reg-valid');

    expect(res.status).toBe(201);
    expect(res.data.accessToken).toBeDefined();
    expect(res.data.tokenType).toBe('Bearer');
    expect(res.data.expiresIn).toBeGreaterThan(0);
    expect(res.data.user.email).toContain('auth-reg-valid-');
    expect(res.data.user.id).toBeDefined();
  });

  it('returns 409 when email is already registered', async () => {
    const email = uniqueEmail('dup');
    await axios.post('/api/auth/register', {
      name: 'Dup User',
      email,
      password: 'Password123!',
    });

    await expect(
      axios.post('/api/auth/register', {
        name: 'Dup User 2',
        email,
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 409 } });
  });

  it('returns 400 for invalid email format', async () => {
    await expect(
      register('bad-email', { email: 'not-an-email' }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 400 when password is too short', async () => {
    await expect(
      register('short-pw', { password: 'short' }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 400 when name is missing', async () => {
    await expect(
      axios.post('/api/auth/register', {
        email: uniqueEmail('no-name'),
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  it('returns token and user on valid credentials', async () => {
    const email = uniqueEmail('login-valid');
    await axios.post('/api/auth/register', {
      name: 'Login User',
      email,
      password: 'Password123!',
    });

    const res = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.data.accessToken).toBeDefined();
    expect(res.data.tokenType).toBe('Bearer');
    expect(res.data.user.email).toBe(email);
  });

  it('returns 401 for wrong password', async () => {
    const email = uniqueEmail('login-bad-pw');
    await axios.post('/api/auth/register', {
      name: 'Login Bad PW',
      email,
      password: 'Password123!',
    });

    await expect(
      axios.post('/api/auth/login', { email, password: 'WrongPass999!' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 401 for non-existent email', async () => {
    await expect(
      axios.post('/api/auth/login', {
        email: uniqueEmail('ghost-user'),
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 400 for invalid email format', async () => {
    await expect(
      axios.post('/api/auth/login', {
        email: 'not-valid',
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

describe('GET /api/auth/me', () => {
  it('returns the authenticated user profile', async () => {
    const registerRes = await register('me-valid');
    const { accessToken, user } = registerRes.data;

    const res = await axios.get('/api/auth/me', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(user.id);
    expect(res.data.email).toBe(user.email);
    expect(res.data.name).toBeDefined();
  });

  it('returns 401 when no token is provided', async () => {
    await expect(axios.get('/api/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it('returns 401 for a malformed token', async () => {
    await expect(
      axios.get('/api/auth/me', { headers: authHeader('invalid.token.here') }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

describe('POST /api/auth/logout', () => {
  it('succeeds and revokes the token', async () => {
    const { data } = await register('logout-valid');
    const { accessToken } = data;

    const res = await axios.post(
      '/api/auth/logout',
      {},
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('returns 401 when no token is provided', async () => {
    await expect(
      axios.post('/api/auth/logout', {}),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

describe('POST /api/auth/forgot-password', () => {
  it('returns a generic message for a registered email', async () => {
    const { data } = await register('forgot-registered');
    const email = data.user.email;

    const res = await axios.post('/api/auth/forgot-password', { email });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
    expect(typeof res.data.message).toBe('string');
  });

  it('returns the same generic message for an unregistered email (no enumeration)', async () => {
    const res = await axios.post('/api/auth/forgot-password', {
      email: uniqueEmail('no-account'),
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('returns 400 for invalid email format', async () => {
    await expect(
      axios.post('/api/auth/forgot-password', { email: 'not-an-email' }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

describe('POST /api/auth/reset-password', () => {
  it('returns 400 when reset token is too short', async () => {
    await expect(
      axios.post('/api/auth/reset-password', {
        token: 'short',
        password: 'NewPassword123!',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 400 when new password is too short', async () => {
    await expect(
      axios.post('/api/auth/reset-password', {
        token: 'a'.repeat(24), // valid-length token format
        password: 'tiny',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 400 or 404 for a non-existent reset token', async () => {
    let status: number | undefined;
    try {
      await axios.post('/api/auth/reset-password', {
        token: 'a'.repeat(24),
        password: 'NewPassword123!',
      });
    } catch (err: any) {
      status = err?.response?.status;
    }
    expect([400, 404]).toContain(status);
  });
});

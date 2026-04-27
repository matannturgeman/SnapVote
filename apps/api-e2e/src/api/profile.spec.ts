import axios from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueEmail(suffix: string) {
  return `profile-${suffix}-${Date.now()}@example.com`;
}

async function register(suffix: string) {
  const res = await axios.post('/api/auth/register', {
    name: `Profile User ${suffix}`,
    email: uniqueEmail(suffix),
    password: 'Password123!',
  });
  return res.data as {
    accessToken: string;
    user: { id: number; email: string; name: string };
  };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// GET /api/auth/me — profile fetch
// ---------------------------------------------------------------------------

describe('GET /api/auth/me', () => {
  it('returns full profile for authenticated user', async () => {
    const { accessToken, user } = await register('get-me');

    const res = await axios.get('/api/auth/me', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(user.id);
    expect(res.data.email).toBe(user.email);
    expect(res.data.name).toBeDefined();
    expect(res.data).not.toHaveProperty('passwordHash');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/profile — update profile
// ---------------------------------------------------------------------------

describe('PATCH /api/auth/profile', () => {
  it('updates name and returns updated profile', async () => {
    const { accessToken } = await register('update-name');

    const res = await axios.patch(
      '/api/auth/profile',
      { name: 'Updated Name' },
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.name).toBe('Updated Name');
  });

  it('updates email and reflects change in subsequent /me call', async () => {
    const { accessToken } = await register('update-email');
    const newEmail = uniqueEmail('update-email-new');

    await axios.patch(
      '/api/auth/profile',
      { email: newEmail },
      { headers: authHeader(accessToken) },
    );

    const meRes = await axios.get('/api/auth/me', {
      headers: authHeader(accessToken),
    });

    expect(meRes.data.email).toBe(newEmail);
  });

  it('updates avatarUrl', async () => {
    const { accessToken } = await register('update-avatar');

    const res = await axios.patch(
      '/api/auth/profile',
      { avatarUrl: 'https://example.com/avatar.png' },
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('returns 409 when updating to an already-used email', async () => {
    const { user: other } = await register('conflict-owner');
    const { accessToken } = await register('conflict-requester');

    await expect(
      axios.patch(
        '/api/auth/profile',
        { email: other.email },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 409 } });
  });

  it('returns 401 without token', async () => {
    await expect(
      axios.patch('/api/auth/profile', { name: 'Ghost' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 400 for invalid avatarUrl', async () => {
    const { accessToken } = await register('bad-avatar');

    await expect(
      axios.patch(
        '/api/auth/profile',
        { avatarUrl: 'not-a-url' },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password
// ---------------------------------------------------------------------------

describe('POST /api/auth/change-password', () => {
  it('changes password and invalidates old token', async () => {
    const { accessToken } = await register('change-pw');

    const changeRes = await axios.post(
      '/api/auth/change-password',
      { currentPassword: 'Password123!', newPassword: 'NewPass456!' },
      { headers: authHeader(accessToken) },
    );

    expect(changeRes.status).toBe(200);
    expect(changeRes.data.message).toBeDefined();

    // Old token should now be revoked
    await expect(
      axios.get('/api/auth/me', { headers: authHeader(accessToken) }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('allows login with new password after change', async () => {
    const email = uniqueEmail('pw-change-login');
    await axios.post('/api/auth/register', {
      name: 'PW Change User',
      email,
      password: 'Password123!',
    });
    const { data: loginData } = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    await axios.post(
      '/api/auth/change-password',
      { currentPassword: 'Password123!', newPassword: 'NewPass789!' },
      { headers: authHeader(loginData.accessToken) },
    );

    const newLoginRes = await axios.post('/api/auth/login', {
      email,
      password: 'NewPass789!',
    });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.data.accessToken).toBeDefined();
  });

  it('returns 401 for wrong current password', async () => {
    const { accessToken } = await register('wrong-pw');

    await expect(
      axios.post(
        '/api/auth/change-password',
        { currentPassword: 'WrongPass999!', newPassword: 'NewPass456!' },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 400 when new password is too short', async () => {
    const { accessToken } = await register('short-new-pw');

    await expect(
      axios.post(
        '/api/auth/change-password',
        { currentPassword: 'Password123!', newPassword: 'short' },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/account — soft delete
// ---------------------------------------------------------------------------

describe('DELETE /api/auth/account', () => {
  it('soft-deletes the account and revokes the token', async () => {
    const { accessToken } = await register('delete-me');

    const res = await axios.delete('/api/auth/account', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    // Token should be revoked
    await expect(
      axios.get('/api/auth/me', { headers: authHeader(accessToken) }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('deleted user cannot log in', async () => {
    const email = uniqueEmail('deleted-login');
    await axios.post('/api/auth/register', {
      name: 'Deleted Login',
      email,
      password: 'Password123!',
    });
    const { data: loginData } = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    await axios.delete('/api/auth/account', {
      headers: authHeader(loginData.accessToken),
    });

    await expect(
      axios.post('/api/auth/login', { email, password: 'Password123!' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 401 without token', async () => {
    await expect(axios.delete('/api/auth/account')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/reactivate — account reactivation
// ---------------------------------------------------------------------------

describe('POST /api/auth/reactivate', () => {
  it('reactivates a deleted account and returns a new token', async () => {
    const email = uniqueEmail('reactivate-basic');
    await axios.post('/api/auth/register', {
      name: 'Reactivate User',
      email,
      password: 'Password123!',
    });
    const { data: loginData } = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    await axios.delete('/api/auth/account', {
      headers: authHeader(loginData.accessToken),
    });

    const res = await axios.post('/api/auth/reactivate', {
      email,
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.data.accessToken).toBeDefined();
    expect(res.data.user.email).toBe(email);
  });

  it('reactivated account can be used to access protected endpoints', async () => {
    const email = uniqueEmail('reactivate-access');
    await axios.post('/api/auth/register', {
      name: 'Reactivate Access',
      email,
      password: 'Password123!',
    });
    const { data: loginData } = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    await axios.delete('/api/auth/account', {
      headers: authHeader(loginData.accessToken),
    });

    const { data: reactivateData } = await axios.post('/api/auth/reactivate', {
      email,
      password: 'Password123!',
    });

    const meRes = await axios.get('/api/auth/me', {
      headers: authHeader(reactivateData.accessToken),
    });

    expect(meRes.status).toBe(200);
    expect(meRes.data.email).toBe(email);
  });

  it('reactivated user can log in normally afterwards', async () => {
    const email = uniqueEmail('reactivate-login');
    await axios.post('/api/auth/register', {
      name: 'Reactivate Login',
      email,
      password: 'Password123!',
    });
    const { data: loginData } = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    await axios.delete('/api/auth/account', {
      headers: authHeader(loginData.accessToken),
    });

    await axios.post('/api/auth/reactivate', {
      email,
      password: 'Password123!',
    });

    const loginRes = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data.accessToken).toBeDefined();
  });

  it('returns 401 for wrong password on reactivation', async () => {
    const email = uniqueEmail('reactivate-wrong-pw');
    await axios.post('/api/auth/register', {
      name: 'Reactivate Wrong PW',
      email,
      password: 'Password123!',
    });
    const { data: loginData } = await axios.post('/api/auth/login', {
      email,
      password: 'Password123!',
    });

    await axios.delete('/api/auth/account', {
      headers: authHeader(loginData.accessToken),
    });

    await expect(
      axios.post('/api/auth/reactivate', { email, password: 'WrongPass999!' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 401 for a non-deleted account', async () => {
    const { user } = await register('reactivate-active');

    await expect(
      axios.post('/api/auth/reactivate', {
        email: user.email,
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 401 for an unknown email', async () => {
    await expect(
      axios.post('/api/auth/reactivate', {
        email: uniqueEmail('ghost'),
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('returns 400 for invalid email format', async () => {
    await expect(
      axios.post('/api/auth/reactivate', {
        email: 'not-an-email',
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle: create → update → change password → delete → reactivate → delete
// ---------------------------------------------------------------------------

describe('Full user profile lifecycle', () => {
  it('completes the entire create → update → change-password → delete → reactivate flow', async () => {
    // 1. Register
    const email = uniqueEmail('lifecycle');
    const registerRes = await axios.post('/api/auth/register', {
      name: 'Lifecycle User',
      email,
      password: 'Password123!',
    });
    expect(registerRes.status).toBe(201);
    let token: string = registerRes.data.accessToken;

    // 2. Get profile
    const meRes = await axios.get('/api/auth/me', {
      headers: authHeader(token),
    });
    expect(meRes.data.email).toBe(email);

    // 3. Update profile
    const updateRes = await axios.patch(
      '/api/auth/profile',
      { name: 'Updated Lifecycle', avatarUrl: 'https://example.com/av.png' },
      { headers: authHeader(token) },
    );
    expect(updateRes.data.name).toBe('Updated Lifecycle');
    expect(updateRes.data.avatarUrl).toBe('https://example.com/av.png');

    // 4. Change password (token is revoked; get a fresh one)
    await axios.post(
      '/api/auth/change-password',
      { currentPassword: 'Password123!', newPassword: 'NewLife456!' },
      { headers: authHeader(token) },
    );

    const loginRes = await axios.post('/api/auth/login', {
      email,
      password: 'NewLife456!',
    });
    token = loginRes.data.accessToken;

    // 5. Delete account
    const deleteRes = await axios.delete('/api/auth/account', {
      headers: authHeader(token),
    });
    expect(deleteRes.data.success).toBe(true);

    // 6. Verify deleted user cannot login
    await expect(
      axios.post('/api/auth/login', { email, password: 'NewLife456!' }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    // 7. Reactivate account
    const reactivateRes = await axios.post('/api/auth/reactivate', {
      email,
      password: 'NewLife456!',
    });
    expect(reactivateRes.data.accessToken).toBeDefined();
    token = reactivateRes.data.accessToken;

    // 8. Verify reactivated user is active and profile is intact
    const finalMeRes = await axios.get('/api/auth/me', {
      headers: authHeader(token),
    });
    expect(finalMeRes.data.email).toBe(email);
    expect(finalMeRes.data.name).toBe('Updated Lifecycle');

    // 9. Final cleanup — delete the reactivated account
    await axios.delete('/api/auth/account', { headers: authHeader(token) });
  });
});

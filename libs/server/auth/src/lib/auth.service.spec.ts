import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { prisma } from '@libs/server-data-access';
import * as cryptoUtil from './crypto.util';
import { AuthService } from './auth.service';

const makeConfigService = (): ConfigService =>
  ({
    get: <T>(key: string, defaultValue?: T): T | undefined =>
      (process.env[key] as T | undefined) ?? defaultValue,
  }) as unknown as ConfigService;

jest.mock('@libs/server-data-access', () => ({
  prisma: {
    session: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('./crypto.util', () => ({
  createOpaqueToken: jest.fn(),
  hashOpaqueToken: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

type PrismaMock = {
  session: {
    findFirst: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  passwordResetToken: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('AuthService', () => {
  const prismaMock = prisma as unknown as PrismaMock;
  const cryptoMock = cryptoUtil as jest.Mocked<typeof cryptoUtil>;

  let service: AuthService;
  let mailer: { sendPasswordResetEmail: jest.Mock };
  let envSnapshot: NodeJS.ProcessEnv;

  beforeEach(() => {
    envSnapshot = { ...process.env };

    mailer = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      mailer as unknown as ConstructorParameters<typeof AuthService>[0],
      makeConfigService(),
    );

    jest.clearAllMocks();

    cryptoMock.createOpaqueToken.mockReturnValue('raw-token');
    cryptoMock.hashOpaqueToken.mockImplementation(
      (value: string) => `hash-${value}`,
    );
    cryptoMock.hashPassword.mockImplementation(
      async (value: string) => `hashed-${value}`,
    );
    cryptoMock.verifyPassword.mockResolvedValue(true);

    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.session.create.mockResolvedValue({ id: 'session-1' });
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: 'prt-1' });
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.passwordResetToken.update.mockResolvedValue({ id: 'prt-1' });
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockResolvedValue({ id: 1 });
    prismaMock.session.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    process.env = envSnapshot;
    jest.restoreAllMocks();
  });

  it('verifies a token and returns a normalized logged-in user payload', async () => {
    prismaMock.session.findFirst.mockResolvedValue({
      user: {
        id: 5,
        email: 'person@example.com',
        name: null,
      },
    });

    const result = await service.verifyToken('token-123');

    expect(cryptoMock.hashOpaqueToken).toHaveBeenCalledWith('token-123');
    expect(prismaMock.session.findFirst).toHaveBeenCalled();
    expect(result).toEqual({
      id: 5,
      email: 'person@example.com',
      name: 'person',
    });
  });

  it('throws for invalid token lookups', async () => {
    prismaMock.session.findFirst.mockResolvedValue(null);

    await expect(service.verifyToken('token-123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('creates a session token with metadata', async () => {
    process.env.AUTH_SESSION_TTL_SECONDS = '60';

    const token = await service.signToken(
      { id: 7, email: 'x@y.com', name: 'X' },
      { ipAddress: '1.2.3.4', userAgent: 'jest' },
    );

    expect(token).toBe('raw-token');
    expect(prismaMock.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 7,
          tokenHash: 'hash-raw-token',
          ipAddress: '1.2.3.4',
          userAgent: 'jest',
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('falls back to default session ttl and logs warning for invalid env', async () => {
    process.env.AUTH_SESSION_TTL_SECONDS = 'abc';
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.signToken({ id: 1, email: 'a@b.com', name: 'A' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid AUTH_SESSION_TTL_SECONDS value'),
    );
  });

  it('registers a new user and returns auth response', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 10,
      email: 'new@example.com',
      name: '  New User  ',
      avatarUrl: null,
    });

    const response = await service.register(
      {
        email: ' NEW@Example.com ',
        password: 'secret123',
        name: '  New User  ',
      },
      { ipAddress: '8.8.8.8' },
    );

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          name: 'New User',
          passwordHash: 'hashed-secret123',
        }),
      }),
    );

    expect(response).toEqual(
      expect.objectContaining({
        accessToken: 'raw-token',
        tokenType: 'Bearer',
        user: expect.objectContaining({
          id: 10,
          email: 'new@example.com',
          name: 'New User',
        }),
      }),
    );
  });

  it('rejects registration for existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.register({
        email: 'used@example.com',
        password: 'secret123',
        name: 'Used',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('logs in with normalized email and verified password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 22,
      email: 'hello@example.com',
      name: 'Hello',
      passwordHash: 'stored',
    });

    const response = await service.login(' HELLO@EXAMPLE.COM ', 'pw123456');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'hello@example.com' } }),
    );
    expect(cryptoMock.verifyPassword).toHaveBeenCalledWith(
      'pw123456',
      'stored',
    );
    expect(response.user.email).toBe('hello@example.com');
  });

  it('rejects login when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.login('nope@example.com', 'pw123456')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects login when password verification fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 22,
      email: 'hello@example.com',
      name: 'Hello',
      passwordHash: 'stored',
    });
    cryptoMock.verifyPassword.mockResolvedValue(false);

    await expect(service.login('hello@example.com', 'bad')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns early for forgot-password when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await service.createForgotPasswordToken('missing@example.com');

    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('creates reset token and sends forgot-password email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'reset@example.com',
      name: 'Reset User',
    });

    await service.createForgotPasswordToken('reset@example.com');

    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 2,
          tokenHash: 'hash-raw-token',
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(mailer.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'reset@example.com',
      name: 'Reset User',
      token: 'raw-token',
    });
  });

  it('deletes forgotten-password token when email send fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'reset@example.com',
      name: 'Reset User',
    });
    mailer.sendPasswordResetEmail.mockRejectedValue(new Error('smtp down'));
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await service.createForgotPasswordToken('reset@example.com');

    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: 'hash-raw-token',
        usedAt: null,
      },
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send password reset email'),
    );
  });

  it('logs stringified unknown errors from forgot-password email failures', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'reset@example.com',
      name: 'Reset User',
    });
    mailer.sendPasswordResetEmail.mockRejectedValue('smtp down as string');
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await service.createForgotPasswordToken('reset@example.com');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('smtp down as string'),
    );
  });

  it('uses fallback reset ttl and logs warning for invalid env', async () => {
    process.env.AUTH_RESET_TOKEN_TTL_MINUTES = '0';
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'reset@example.com',
      name: 'Reset User',
    });
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.createForgotPasswordToken('reset@example.com');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid AUTH_RESET_TOKEN_TTL_MINUTES value'),
    );
  });

  it('rejects password reset for invalid token', async () => {
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);

    await expect(service.resetPassword('nope', 'new-secret')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('resets password and revokes existing sessions', async () => {
    prismaMock.passwordResetToken.findFirst.mockResolvedValue({
      id: 'prt-1',
      userId: 9,
    });

    await service.resetPassword('valid-token', 'new-secret');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { passwordHash: 'hashed-new-secret' },
    });
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalled();
    expect(prismaMock.session.updateMany).toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('revokes token session', async () => {
    await service.revokeToken('dead-token');

    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: 'hash-dead-token',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('returns user profile with display name fallback', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 101,
      email: 'fallback@example.com',
      name: null,
      avatarUrl: null,
    });

    const profile = await service.getUserProfile(101);

    expect(profile).toEqual({
      id: 101,
      email: 'fallback@example.com',
      name: 'fallback',
      avatarUrl: null,
    });
  });

  it('falls back to default display name when local part is too short', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 102,
      email: 'a@example.com',
      name: null,
    });

    const profile = await service.getUserProfile(102);

    expect(profile.name).toBe('User');
  });

  it('throws when requested user profile no longer exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.getUserProfile(101)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('updateProfile', () => {
    it('updates user profile and returns updated user', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 1, email: 'old@example.com' })
        .mockResolvedValueOnce(null);
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        email: 'new@example.com',
        name: 'New Name',
        avatarUrl: 'https://example.com/avatar.png',
      });

      const result = await service.updateProfile(1, {
        name: 'New Name',
        email: 'new@example.com',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(result).toEqual({
        id: 1,
        email: 'new@example.com',
        name: 'New Name',
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            name: 'New Name',
            email: 'new@example.com',
            avatarUrl: 'https://example.com/avatar.png',
          }),
        }),
      );
    });

    it('throws ConflictException when new email is already taken', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 1, email: 'old@example.com' })
        .mockResolvedValueOnce({ id: 2, email: 'taken@example.com' });

      await expect(
        service.updateProfile(1, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows setting avatarUrl to null', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'a@b.com',
      });
      prismaMock.user.update.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        name: 'Test',
        avatarUrl: null,
      });

      const result = await service.updateProfile(1, { avatarUrl: null });

      expect(result.avatarUrl).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('changes password and revokes all sessions', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        passwordHash: 'old-hash',
      });
      cryptoMock.verifyPassword.mockResolvedValue(true);

      await service.changePassword(1, {
        currentPassword: 'old-pass',
        newPassword: 'new-secret',
      });

      expect(cryptoMock.hashPassword).toHaveBeenCalledWith('new-secret');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('throws when current password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        passwordHash: 'old-hash',
      });
      cryptoMock.verifyPassword.mockResolvedValue(false);

      await expect(
        service.changePassword(1, {
          currentPassword: 'wrong-pass',
          newPassword: 'new-secret',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteAccount', () => {
    it('soft deletes account and revokes all sessions', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1 });

      await service.deleteAccount(1);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          deleted: true,
          deletedAt: expect.any(Date),
          email: expect.stringContaining('@deleted.local'),
        },
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('throws when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount(999)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

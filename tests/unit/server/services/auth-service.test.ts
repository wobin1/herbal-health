import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Secret, TOTP } from 'otpauth';
import { hashPassword } from '@/lib/auth/password';

const prismaMock = {
  adminUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  adminSession: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const {
  login,
  verifyMfaAndCreateSession,
  InvalidCredentialsError,
  AccountLockedError,
  InvalidMfaError,
} = await import('@/server/services/auth-service');

const PASSWORD = 'Correct-Horse-Battery-Staple-1!';

function baseAdminUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'admin-1',
    email: 'admin@herbalhealth.test',
    role: 'ADMIN',
    passwordHash: '',
    mfaSecret: null,
    mfaEnabled: false,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    isActive: true,
    ...overrides,
  };
}

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-value-not-for-production';
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.adminSession.create.mockResolvedValue({});
});

describe('login', () => {
  it('rejects an unknown email without revealing whether the account exists', async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue(null);
    await expect(login('nobody@herbalhealth.test', PASSWORD)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('rejects a locked account even with the correct password', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(
      baseAdminUser({ passwordHash, lockedUntil: new Date(Date.now() + 60_000) }),
    );
    await expect(login('admin@herbalhealth.test', PASSWORD)).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('increments the failed-login counter and locks after 5 failures', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(
      baseAdminUser({ passwordHash, failedLoginCount: 4 }),
    );

    await expect(login('admin@herbalhealth.test', 'wrong-password')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );

    expect(prismaMock.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { failedLoginCount: 5, lockedUntil: expect.any(Date) },
    });
  });

  it('returns an MFA setup challenge for a correct password when MFA is not yet enabled', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(baseAdminUser({ passwordHash }));

    const result = await login('admin@herbalhealth.test', PASSWORD);

    expect(result.status).toBe('mfa_setup_required');
    if (result.status === 'mfa_setup_required') {
      expect(result.provisioningUri).toMatch(/^otpauth:\/\/totp\//);
      expect(result.challengeToken).toBeTruthy();
    }
  });

  it('returns an MFA-required challenge (not a session) when MFA is already enabled', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(
      baseAdminUser({ passwordHash, mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP' }),
    );

    const result = await login('admin@herbalhealth.test', PASSWORD);
    expect(result.status).toBe('mfa_required');
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();
  });
});

describe('verifyMfaAndCreateSession', () => {
  it('creates a session and enables MFA after a valid setup code', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const secret = 'JBSWY3DPEHPK3PXP';
    prismaMock.adminUser.findUnique.mockResolvedValue(
      baseAdminUser({ passwordHash, mfaSecret: secret, mfaEnabled: false }),
    );

    const login1 = await login('admin@herbalhealth.test', PASSWORD);
    if (login1.status !== 'mfa_setup_required') throw new Error('expected mfa_setup_required');

    const code = new TOTP({ secret: Secret.fromBase32(secret) }).generate();
    const session = await verifyMfaAndCreateSession(login1.challengeToken, code);

    expect(session.token).toBeTruthy();
    expect(prismaMock.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { mfaEnabled: true },
    });
    expect(prismaMock.adminSession.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid MFA code and does not create a session', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const secret = 'JBSWY3DPEHPK3PXP';
    prismaMock.adminUser.findUnique.mockResolvedValue(
      baseAdminUser({ passwordHash, mfaSecret: secret, mfaEnabled: true }),
    );

    const login1 = await login('admin@herbalhealth.test', PASSWORD);
    if (login1.status !== 'mfa_required') throw new Error('expected mfa_required');

    await expect(verifyMfaAndCreateSession(login1.challengeToken, '000000')).rejects.toBeInstanceOf(
      InvalidMfaError,
    );
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();
  });

  describe('DEV_MFA_BYPASS_CODE', () => {
    afterEach(() => {
      delete process.env.DEV_MFA_BYPASS_CODE;
    });

    it('creates a session via the bypass code and marks the audit log entry as a bypass', async () => {
      process.env.DEV_MFA_BYPASS_CODE = '000000';
      const passwordHash = await hashPassword(PASSWORD);
      const secret = 'JBSWY3DPEHPK3PXP';
      prismaMock.adminUser.findUnique.mockResolvedValue(
        baseAdminUser({ passwordHash, mfaSecret: secret, mfaEnabled: true }),
      );

      const login1 = await login('admin@herbalhealth.test', PASSWORD);
      if (login1.status !== 'mfa_required') throw new Error('expected mfa_required');

      const session = await verifyMfaAndCreateSession(login1.challengeToken, '000000');

      expect(session.token).toBeTruthy();
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGIN_SUCCESS',
            metadata: expect.objectContaining({ viaMfaBypass: true }),
          }),
        }),
      );
    });
  });
});

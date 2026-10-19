import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '@/lib/auth/password';
import { hashLoginCode } from '@/lib/auth/mfa';

const prismaMock = {
  adminUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  adminSession: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  adminLoginCode: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

const sendEmailMock = vi.fn();

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
vi.mock('@/lib/email/provider', () => ({ getEmailProvider: () => ({ send: sendEmailMock }) }));

const {
  login,
  verifyMfaAndCreateSession,
  InvalidCredentialsError,
  AccountLockedError,
  InvalidMfaError,
  LoginCodeDeliveryError,
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
  prismaMock.adminLoginCode.updateMany.mockResolvedValue({ count: 1 });
  sendEmailMock.mockResolvedValue(undefined);
});

function storedLoginCode(code: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'code-1',
    adminUserId: 'admin-1',
    codeHash: hashLoginCode(code),
    expiresAt: new Date(Date.now() + 5 * 60_000),
    consumedAt: null,
    attempts: 0,
    ...overrides,
  };
}

async function challengeFor(adminOverrides: Partial<Record<string, unknown>> = {}) {
  const passwordHash = await hashPassword(PASSWORD);
  prismaMock.adminUser.findUnique.mockResolvedValue(
    baseAdminUser({ passwordHash, ...adminOverrides }),
  );
  const result = await login('admin@herbalhealth.test', PASSWORD);
  vi.clearAllMocks();
  prismaMock.adminUser.findUnique.mockResolvedValue(
    baseAdminUser({ passwordHash, ...adminOverrides }),
  );
  prismaMock.adminSession.create.mockResolvedValue({});
  prismaMock.adminLoginCode.updateMany.mockResolvedValue({ count: 1 });
  return result.challengeToken;
}

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
    await expect(login('admin@herbalhealth.test', PASSWORD)).rejects.toBeInstanceOf(
      AccountLockedError,
    );
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

  it('emails a 6-digit code and returns a challenge (not a session) for a correct password', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(baseAdminUser({ passwordHash }));

    const result = await login('admin@herbalhealth.test', PASSWORD);

    expect(result.status).toBe('mfa_required');
    expect(result.challengeToken).toBeTruthy();
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sent = sendEmailMock.mock.calls[0][0];
    expect(sent.toEmail).toBe('admin@herbalhealth.test');
    const code = sent.text.match(/\b(\d{6})\b/)?.[1];
    expect(code).toBeTruthy();

    // Only a hash of the code is stored, and earlier codes are invalidated.
    expect(prismaMock.adminLoginCode.deleteMany).toHaveBeenCalledWith({
      where: { adminUserId: 'admin-1' },
    });
    const stored = prismaMock.adminLoginCode.create.mock.calls[0][0].data;
    expect(stored.codeHash).toBe(hashLoginCode(code!));
    expect(JSON.stringify(stored)).not.toContain(code);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not send a code when the password is wrong', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(baseAdminUser({ passwordHash }));

    await expect(login('admin@herbalhealth.test', 'wrong-password')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(prismaMock.adminLoginCode.create).not.toHaveBeenCalled();
  });

  it('reports a delivery failure when the code email cannot be sent', async () => {
    const passwordHash = await hashPassword(PASSWORD);
    prismaMock.adminUser.findUnique.mockResolvedValue(baseAdminUser({ passwordHash }));
    sendEmailMock.mockRejectedValue(new Error('Resend API error (500)'));

    await expect(login('admin@herbalhealth.test', PASSWORD)).rejects.toBeInstanceOf(
      LoginCodeDeliveryError,
    );
  });
});

describe('verifyMfaAndCreateSession', () => {
  it('creates a session and consumes the code when it matches', async () => {
    const challengeToken = await challengeFor();
    prismaMock.adminLoginCode.findFirst.mockResolvedValue(storedLoginCode('123456'));

    const session = await verifyMfaAndCreateSession(challengeToken, '123456');

    expect(session.token).toBeTruthy();
    expect(prismaMock.adminLoginCode.updateMany).toHaveBeenCalledWith({
      where: { id: 'code-1', consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
    expect(prismaMock.adminSession.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong code, counts the attempt, and does not create a session', async () => {
    const challengeToken = await challengeFor();
    prismaMock.adminLoginCode.findFirst.mockResolvedValue(storedLoginCode('123456'));

    await expect(verifyMfaAndCreateSession(challengeToken, '000000')).rejects.toBeInstanceOf(
      InvalidMfaError,
    );

    expect(prismaMock.adminLoginCode.update).toHaveBeenCalledWith({
      where: { id: 'code-1' },
      data: { attempts: { increment: 1 } },
    });
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();
  });

  it('rejects an expired code even if it matches', async () => {
    const challengeToken = await challengeFor();
    prismaMock.adminLoginCode.findFirst.mockResolvedValue(
      storedLoginCode('123456', { expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(verifyMfaAndCreateSession(challengeToken, '123456')).rejects.toBeInstanceOf(
      InvalidMfaError,
    );
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();
  });

  it('rejects a matching code after too many wrong attempts', async () => {
    const challengeToken = await challengeFor();
    prismaMock.adminLoginCode.findFirst.mockResolvedValue(
      storedLoginCode('123456', { attempts: 5 }),
    );

    await expect(verifyMfaAndCreateSession(challengeToken, '123456')).rejects.toBeInstanceOf(
      InvalidMfaError,
    );
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();
  });

  it('rejects when there is no outstanding code', async () => {
    const challengeToken = await challengeFor();
    prismaMock.adminLoginCode.findFirst.mockResolvedValue(null);

    await expect(verifyMfaAndCreateSession(challengeToken, '123456')).rejects.toBeInstanceOf(
      InvalidMfaError,
    );
    expect(prismaMock.adminSession.create).not.toHaveBeenCalled();
  });

  it('rejects reuse of a code another request already consumed', async () => {
    const challengeToken = await challengeFor();
    prismaMock.adminLoginCode.findFirst.mockResolvedValue(storedLoginCode('123456'));
    prismaMock.adminLoginCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(verifyMfaAndCreateSession(challengeToken, '123456')).rejects.toBeInstanceOf(
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
      const challengeToken = await challengeFor();
      prismaMock.adminLoginCode.findFirst.mockResolvedValue(null);

      const session = await verifyMfaAndCreateSession(challengeToken, '000000');

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

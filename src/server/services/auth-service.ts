import { prisma } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/password';
import {
  generateLoginCode,
  hashLoginCode,
  loginCodeMatches,
  isMfaBypassCode,
} from '@/lib/auth/mfa';
import { issueChallengeToken, verifyChallengeToken } from '@/lib/auth/challenge-token';
import { rotateSession, invalidateSessionToken, type SessionMeta } from '@/lib/auth/session';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { getEmailProvider } from '@/lib/email/provider';
import { renderAdminLoginCodeEmail } from '@/lib/email/templates';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOGIN_CODE_TTL_MINUTES = 10;
const MAX_LOGIN_CODE_ATTEMPTS = 5;

export class InvalidCredentialsError extends Error {}
export class AccountLockedError extends Error {}
export class InvalidMfaError extends Error {}
export class InvalidChallengeError extends Error {}
export class LoginCodeDeliveryError extends Error {}

export type LoginResult = { status: 'mfa_required'; challengeToken: string };

export async function login(
  email: string,
  password: string,
  meta: SessionMeta & { ipAddress?: string | null } = {},
): Promise<LoginResult> {
  const adminUser = await prisma.adminUser.findUnique({ where: { email } });

  if (!adminUser || !adminUser.isActive) {
    await recordAuditLog({
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      entityId: adminUser?.id ?? null,
      ipAddress: meta.ipAddress,
      metadata: { email },
    });
    throw new InvalidCredentialsError('Invalid email or password');
  }

  if (adminUser.lockedUntil && adminUser.lockedUntil.getTime() > Date.now()) {
    throw new AccountLockedError('Account is temporarily locked');
  }

  const passwordValid = await verifyPassword(adminUser.passwordHash, password);
  if (!passwordValid) {
    const failedLoginCount = adminUser.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { failedLoginCount, lockedUntil },
    });
    await recordAuditLog({
      actorId: adminUser.id,
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      entityId: adminUser.id,
      ipAddress: meta.ipAddress,
    });
    throw new InvalidCredentialsError('Invalid email or password');
  }

  if (adminUser.failedLoginCount > 0 || adminUser.lockedUntil) {
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  const code = generateLoginCode();
  await prisma.adminLoginCode.deleteMany({ where: { adminUserId: adminUser.id } });
  await prisma.adminLoginCode.create({
    data: {
      adminUserId: adminUser.id,
      codeHash: hashLoginCode(code),
      expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  try {
    await getEmailProvider().send({
      toEmail: adminUser.email,
      ...renderAdminLoginCodeEmail(code, LOGIN_CODE_TTL_MINUTES),
    });
  } catch (error) {
    throw new LoginCodeDeliveryError('Unable to send sign-in code', { cause: error });
  }

  return {
    status: 'mfa_required',
    challengeToken: issueChallengeToken(adminUser.id, 'mfa_required'),
  };
}

export interface VerifiedSession {
  token: string;
  expiresAt: Date;
  adminUser: { id: string; email: string; role: string };
}

export async function verifyMfaAndCreateSession(
  challengeToken: string,
  code: string,
  meta: SessionMeta & { ipAddress?: string | null } = {},
): Promise<VerifiedSession> {
  const challenge = verifyChallengeToken(challengeToken);
  if (!challenge) throw new InvalidChallengeError('Challenge expired or invalid');

  const adminUser = await prisma.adminUser.findUnique({ where: { id: challenge.adminUserId } });
  if (!adminUser || !adminUser.isActive) {
    throw new InvalidChallengeError('Challenge expired or invalid');
  }

  const viaMfaBypass = isMfaBypassCode(code);
  const codeValid = viaMfaBypass || (await consumeLoginCode(adminUser.id, code));
  if (!codeValid) {
    await recordAuditLog({
      actorId: adminUser.id,
      action: 'MFA_FAILED',
      entityType: 'AdminUser',
      entityId: adminUser.id,
      ipAddress: meta.ipAddress,
    });
    throw new InvalidMfaError('Invalid authentication code');
  }

  const { token, expiresAt } = await rotateSession(null, adminUser.id, meta);
  await prisma.adminUser.update({ where: { id: adminUser.id }, data: { lastLoginAt: new Date() } });
  await recordAuditLog({
    actorId: adminUser.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'AdminUser',
    entityId: adminUser.id,
    ipAddress: meta.ipAddress,
    metadata: viaMfaBypass ? { viaMfaBypass: true } : undefined,
  });

  return {
    token,
    expiresAt,
    adminUser: { id: adminUser.id, email: adminUser.email, role: adminUser.role },
  };
}

/** Checks the admin's outstanding code; on a match, marks it used so it can't be replayed. */
async function consumeLoginCode(adminUserId: string, code: string): Promise<boolean> {
  const loginCode = await prisma.adminLoginCode.findFirst({
    where: { adminUserId, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!loginCode) return false;
  if (loginCode.expiresAt.getTime() <= Date.now()) return false;
  if (loginCode.attempts >= MAX_LOGIN_CODE_ATTEMPTS) return false;

  if (!loginCodeMatches(loginCode.codeHash, code)) {
    await prisma.adminLoginCode.update({
      where: { id: loginCode.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  // Conditional update so two concurrent requests with the same code can't both succeed.
  const { count } = await prisma.adminLoginCode.updateMany({
    where: { id: loginCode.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}

export async function logout(
  sessionToken: string,
  actorId: string,
  ipAddress?: string | null,
): Promise<void> {
  await invalidateSessionToken(sessionToken);
  await recordAuditLog({
    actorId,
    action: 'LOGOUT',
    entityType: 'AdminUser',
    entityId: actorId,
    ipAddress,
  });
}

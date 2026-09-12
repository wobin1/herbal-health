import { prisma } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { generateMfaSecret, buildProvisioningUri, verifyMfaToken } from '@/lib/auth/mfa';
import { issueChallengeToken, verifyChallengeToken } from '@/lib/auth/challenge-token';
import { rotateSession, invalidateSessionToken, type SessionMeta } from '@/lib/auth/session';
import { recordAuditLog } from '@/server/services/audit-log-service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class InvalidCredentialsError extends Error {}
export class AccountLockedError extends Error {}
export class InvalidMfaError extends Error {}
export class InvalidChallengeError extends Error {}

export type LoginResult =
  | { status: 'mfa_required'; challengeToken: string }
  | { status: 'mfa_setup_required'; challengeToken: string; provisioningUri: string };

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

  if (!adminUser.mfaEnabled) {
    const secret = adminUser.mfaSecret ?? generateMfaSecret();
    if (!adminUser.mfaSecret) {
      await prisma.adminUser.update({ where: { id: adminUser.id }, data: { mfaSecret: secret } });
    }
    return {
      status: 'mfa_setup_required',
      challengeToken: issueChallengeToken(adminUser.id, 'mfa_setup'),
      provisioningUri: buildProvisioningUri(adminUser.email, secret),
    };
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
  if (!adminUser || !adminUser.isActive || !adminUser.mfaSecret) {
    throw new InvalidChallengeError('Challenge expired or invalid');
  }

  const codeValid = verifyMfaToken(adminUser.mfaSecret, code);
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

  if (challenge.mode === 'mfa_setup') {
    await prisma.adminUser.update({ where: { id: adminUser.id }, data: { mfaEnabled: true } });
  }

  const { token, expiresAt } = await rotateSession(null, adminUser.id, meta);
  await prisma.adminUser.update({ where: { id: adminUser.id }, data: { lastLoginAt: new Date() } });
  const viaMfaBypass = Boolean(process.env.DEV_MFA_BYPASS_CODE) && code === process.env.DEV_MFA_BYPASS_CODE;
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

export async function logout(sessionToken: string, actorId: string, ipAddress?: string | null): Promise<void> {
  await invalidateSessionToken(sessionToken);
  await recordAuditLog({
    actorId,
    action: 'LOGOUT',
    entityType: 'AdminUser',
    entityId: actorId,
    ipAddress,
  });
}

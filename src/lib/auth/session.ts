import { randomBytes, createHash } from 'node:crypto';
import type { AdminRole } from '@prisma/client';
import { prisma } from '@/lib/db/client';

export const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface SessionMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(adminUserId: string, meta: SessionMeta = {}) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.adminSession.create({
    data: {
      adminUserId,
      tokenHash,
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

export interface AuthenticatedSession {
  sessionId: string;
  adminUser: {
    id: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
  };
}

export async function verifySessionToken(token: string): Promise<AuthenticatedSession | null> {
  const tokenHash = hashToken(token);
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { adminUser: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.adminUser.isActive) return null;

  return {
    sessionId: session.id,
    adminUser: {
      id: session.adminUser.id,
      email: session.adminUser.email,
      role: session.adminUser.role,
      isActive: session.adminUser.isActive,
    },
  };
}

/** Rotate: invalidate the old session token and issue a new one. Call on login and privilege changes. */
export async function rotateSession(oldToken: string | null, adminUserId: string, meta: SessionMeta = {}) {
  if (oldToken) {
    await invalidateSessionToken(oldToken);
  }
  return createSession(adminUserId, meta);
}

export async function invalidateSessionToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.adminSession.deleteMany({ where: { tokenHash } });
}

/** Invalidate every session for a user — call on password reset or admin deactivation. */
export async function invalidateAllSessionsForUser(adminUserId: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
}

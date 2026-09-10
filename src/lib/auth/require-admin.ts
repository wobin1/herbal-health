import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken, type AuthenticatedSession } from '@/lib/auth/session';
import { hasPermission, type Permission } from '@/lib/auth/rbac';

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export async function getAdminSession(): Promise<AuthenticatedSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Throws UnauthorizedError if not signed in, ForbiddenError if signed in without the permission. */
export async function requirePermission(permission: Permission): Promise<AuthenticatedSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError('Not authenticated');
  if (!hasPermission(session.adminUser.role, permission)) {
    throw new ForbiddenError('Insufficient role');
  }
  return session;
}

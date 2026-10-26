import { createHash, randomBytes } from 'node:crypto';
import type { AdminRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { invalidateAllSessionsForUser } from '@/lib/auth/session';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { getEmailProvider } from '@/lib/email/provider';
import { renderAdminInviteEmail } from '@/lib/email/templates';
import { buildPageResult, toSkipTake, type PageParams } from '@/lib/pagination';
import type { AdminInviteInput, AdminUserUpdateInput } from '@/lib/validation/admin-user';

export class AdminUserNotFoundError extends Error {}
export class AdminUserConflictError extends Error {}
export class InviteNotFoundError extends Error {}
export class InvalidInviteError extends Error {}
export class InviteDeliveryError extends Error {}
/** A change that would lock admins out of the system (self-lockout, last active ADMIN). */
export class AdminUserRuleError extends Error {}

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

// Explicit select so passwordHash and lockout internals never leave the service.
const PUBLIC_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.AdminUserSelect;

export async function listAdminUsers(pageParams: PageParams) {
  const { skip, take } = toSkipTake(pageParams);
  const [users, total] = await Promise.all([
    prisma.adminUser.findMany({ select: PUBLIC_SELECT, orderBy: { email: 'asc' }, skip, take }),
    prisma.adminUser.count(),
  ]);
  return buildPageResult(users, total, pageParams);
}

const INVITE_TTL_HOURS = 72;
const ROLE_LABELS: Record<AdminRole, string> = { ADMIN: 'Admin', CONTENT_EDITOR: 'Content editor' };

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function listPendingInvites() {
  return prisma.adminInvite.findMany({
    where: { consumedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, email: true, role: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** Also used to resend: any outstanding invite for the email is replaced, so only the newest link works. */
export async function inviteAdminUser(input: AdminInviteInput, actor: Actor, baseUrl: string) {
  const existing = await prisma.adminUser.findUnique({ where: { email: input.email } });
  if (existing) throw new AdminUserConflictError('An admin with that email already exists');

  const token = randomBytes(32).toString('base64url');
  await prisma.adminInvite.deleteMany({ where: { email: input.email, consumedAt: null } });
  const invite = await prisma.adminInvite.create({
    data: {
      email: input.email,
      role: input.role,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000),
    },
    select: { id: true, email: true, role: true, expiresAt: true },
  });

  const inviteUrl = `${baseUrl.replace(/\/$/, '')}/admin/accept-invite?token=${token}`;
  try {
    await getEmailProvider().send({
      toEmail: invite.email,
      ...renderAdminInviteEmail(inviteUrl, ROLE_LABELS[invite.role], INVITE_TTL_HOURS),
    });
  } catch (error) {
    await prisma.adminInvite.delete({ where: { id: invite.id } });
    throw new InviteDeliveryError('Unable to send invitation', { cause: error });
  }

  await recordAuditLog({
    actorId: actor.actorId,
    action: 'admin_user.invited',
    entityType: 'AdminInvite',
    entityId: invite.id,
    ipAddress: actor.ipAddress,
    metadata: { email: invite.email, role: invite.role },
  });
  return invite;
}

export async function revokeAdminInvite(id: string, actor: Actor): Promise<void> {
  const invite = await prisma.adminInvite.findUnique({ where: { id } });
  if (!invite) throw new InviteNotFoundError(`Invite ${id} not found`);
  await prisma.adminInvite.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'admin_user.invite_revoked',
    entityType: 'AdminInvite',
    entityId: id,
    ipAddress: actor.ipAddress,
    metadata: { email: invite.email },
  });
}

/** Validates a link token for display on the accept page. Does not consume it. */
export async function getInviteByToken(token: string) {
  const invite = await prisma.adminInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
  if (!invite || invite.consumedAt || invite.expiresAt.getTime() <= Date.now()) {
    throw new InvalidInviteError('Invite is invalid or expired');
  }
  return { email: invite.email, role: invite.role };
}

export async function acceptInvite(
  token: string,
  password: string,
  meta: { ipAddress?: string | null },
): Promise<void> {
  const tokenHash = hashInviteToken(token);
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    // Conditional update so two concurrent requests can't both consume the same token.
    const { count } = await tx.adminInvite.updateMany({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (count !== 1) throw new InvalidInviteError('Invite is invalid or expired');

    const invite = await tx.adminInvite.findUnique({ where: { tokenHash } });
    if (!invite) throw new InvalidInviteError('Invite is invalid or expired');
    if (await tx.adminUser.findUnique({ where: { email: invite.email } })) {
      throw new InvalidInviteError('Invite is invalid or expired');
    }

    const user = await tx.adminUser.create({
      data: { email: invite.email, role: invite.role, passwordHash, isActive: true },
      select: { id: true },
    });
    await recordAuditLog(
      {
        actorId: user.id,
        action: 'admin_user.invite_accepted',
        entityType: 'AdminUser',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        metadata: { email: invite.email, role: invite.role },
      },
      tx,
    );
  });
}

export async function updateAdminUser(id: string, input: AdminUserUpdateInput, actor: Actor) {
  const passwordHash = input.password ? await hashPassword(input.password) : null;

  const user = await prisma.$transaction(
    async (tx) => {
      const current = await tx.adminUser.findUnique({ where: { id }, select: PUBLIC_SELECT });
      if (!current) throw new AdminUserNotFoundError(`Admin user ${id} not found`);

      const roleChanges = input.role !== undefined && input.role !== current.role;
      const deactivates = input.isActive === false && current.isActive;

      if (id === actor.actorId && (roleChanges || deactivates)) {
        throw new AdminUserRuleError('You cannot change your own role or deactivate yourself');
      }
      if (current.role === 'ADMIN' && current.isActive && (roleChanges || deactivates)) {
        const activeAdmins = await tx.adminUser.count({ where: { role: 'ADMIN', isActive: true } });
        if (activeAdmins <= 1) {
          throw new AdminUserRuleError('At least one active admin is required');
        }
      }

      const data: Prisma.AdminUserUpdateInput = {};
      if (input.role !== undefined) data.role = input.role;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      if (passwordHash) {
        data.passwordHash = passwordHash;
        data.failedLoginCount = 0;
        data.lockedUntil = null;
      }

      const updated = await tx.adminUser.update({ where: { id }, data, select: PUBLIC_SELECT });
      await recordAuditLog(
        {
          actorId: actor.actorId,
          action: 'admin_user.updated',
          entityType: 'AdminUser',
          entityId: id,
          ipAddress: actor.ipAddress,
          // Field names only — never the password or its hash.
          metadata: { fields: Object.keys(input), from: { role: current.role, isActive: current.isActive } },
        },
        tx,
      );
      return updated;
    },
    { isolationLevel: 'Serializable' },
  );

  // Role change, deactivation and password reset all end the user's existing sessions.
  await invalidateAllSessionsForUser(id);
  return user;
}

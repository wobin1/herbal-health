import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = {
  adminUser: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), create: vi.fn() },
  adminInvite: { updateMany: vi.fn(), findUnique: vi.fn() },
};
const prismaMock = {
  adminUser: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
  adminInvite: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));
const hashPasswordMock = vi.fn(async (p: string) => `hashed:${p}`);
vi.mock('@/lib/auth/password', () => ({ hashPassword: hashPasswordMock }));
const invalidateAllMock = vi.fn();
vi.mock('@/lib/auth/session', () => ({ invalidateAllSessionsForUser: invalidateAllMock }));
const sendMock = vi.fn();
vi.mock('@/lib/email/provider', () => ({ getEmailProvider: () => ({ send: sendMock }) }));

const {
  listAdminUsers,
  inviteAdminUser,
  revokeAdminInvite,
  getInviteByToken,
  acceptInvite,
  updateAdminUser,
  AdminUserNotFoundError,
  AdminUserConflictError,
  AdminUserRuleError,
  InviteNotFoundError,
  InvalidInviteError,
  InviteDeliveryError,
} = await import('@/server/services/admin-user-service');

const ACTOR = { actorId: 'admin-1', ipAddress: '127.0.0.1' };

const row = (over: Record<string, unknown> = {}) => ({
  id: 'u-2',
  email: 'ed@example.com',
  role: 'CONTENT_EDITOR',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  tx.adminUser.count.mockResolvedValue(2);
});

describe('listAdminUsers', () => {
  it('never selects the password hash', async () => {
    prismaMock.adminUser.findMany.mockResolvedValue([]);
    prismaMock.adminUser.count.mockResolvedValue(0);
    await listAdminUsers({ page: 1, pageSize: 15 });
    const args = prismaMock.adminUser.findMany.mock.calls[0][0];
    expect(args.select.passwordHash).toBeUndefined();
    expect(args.select.email).toBe(true);
  });
});

const BASE_URL = 'https://herbal.test';

describe('inviteAdminUser', () => {
  beforeEach(() => {
    prismaMock.adminUser.findUnique.mockResolvedValue(null);
    prismaMock.adminInvite.create.mockResolvedValue({
      id: 'inv-1',
      email: 'ed@example.com',
      role: 'CONTENT_EDITOR',
      expiresAt: new Date(Date.now() + 1000),
    });
  });

  it('stores only a hash of the token and emails the link containing the raw token', async () => {
    await inviteAdminUser({ email: 'ed@example.com', role: 'CONTENT_EDITOR' }, ACTOR, BASE_URL);
    const stored = prismaMock.adminInvite.create.mock.calls[0][0].data;
    const mail = sendMock.mock.calls[0][0];
    const link = /https:\/\/herbal\.test\/admin\/accept-invite\?token=([\w-]+)/.exec(mail.text);
    expect(link).not.toBeNull();
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.tokenHash).not.toContain(link![1]);
    expect(mail.toEmail).toBe('ed@example.com');
  });

  it('replaces any outstanding invite for the same email (resend)', async () => {
    await inviteAdminUser({ email: 'ed@example.com', role: 'ADMIN' }, ACTOR, BASE_URL);
    expect(prismaMock.adminInvite.deleteMany).toHaveBeenCalledWith({
      where: { email: 'ed@example.com', consumedAt: null },
    });
  });

  it('audits the invite without the token', async () => {
    await inviteAdminUser({ email: 'ed@example.com', role: 'ADMIN' }, ACTOR, BASE_URL);
    const audit = auditLogMock.mock.calls[0][0];
    expect(audit).toMatchObject({ action: 'admin_user.invited', entityType: 'AdminInvite' });
    expect(JSON.stringify(audit)).not.toMatch(/token/i);
  });

  it('rejects an email that already has an account', async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue({ id: 'x' });
    await expect(
      inviteAdminUser({ email: 'ed@example.com', role: 'ADMIN' }, ACTOR, BASE_URL),
    ).rejects.toThrow(AdminUserConflictError);
    expect(prismaMock.adminInvite.create).not.toHaveBeenCalled();
  });

  it('removes the invite and throws if the email cannot be sent', async () => {
    sendMock.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      inviteAdminUser({ email: 'ed@example.com', role: 'ADMIN' }, ACTOR, BASE_URL),
    ).rejects.toThrow(InviteDeliveryError);
    expect(prismaMock.adminInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
  });
});

describe('revokeAdminInvite', () => {
  it('throws when the invite does not exist', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(null);
    await expect(revokeAdminInvite('nope', ACTOR)).rejects.toThrow(InviteNotFoundError);
  });

  it('deletes and audits', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue({ id: 'inv-1', email: 'ed@example.com' });
    await revokeAdminInvite('inv-1', ACTOR);
    expect(prismaMock.adminInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin_user.invite_revoked' }));
  });
});

describe('getInviteByToken', () => {
  const valid = { email: 'ed@example.com', role: 'ADMIN', consumedAt: null, expiresAt: new Date(Date.now() + 60_000) };

  it('returns the invite details for a live token', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(valid);
    expect(await getInviteByToken('tok')).toEqual({ email: 'ed@example.com', role: 'ADMIN' });
  });

  it.each([
    ['unknown', null],
    ['consumed', { ...valid, consumedAt: new Date() }],
    ['expired', { ...valid, expiresAt: new Date(Date.now() - 1) }],
  ])('rejects a %s token', async (_label, invite) => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(invite);
    await expect(getInviteByToken('tok')).rejects.toThrow(InvalidInviteError);
  });
});

describe('acceptInvite', () => {
  const invite = { id: 'inv-1', email: 'ed@example.com', role: 'CONTENT_EDITOR' };

  beforeEach(() => {
    tx.adminInvite.updateMany.mockResolvedValue({ count: 1 });
    tx.adminInvite.findUnique.mockResolvedValue(invite);
    tx.adminUser.findUnique.mockResolvedValue(null);
    tx.adminUser.create.mockResolvedValue({ id: 'u-new' });
  });

  it('consumes the token atomically, creates the account with a hashed password, and audits', async () => {
    await acceptInvite('tok', 'a brand new passphrase', { ipAddress: '1.1.1.1' });
    const consume = tx.adminInvite.updateMany.mock.calls[0][0];
    expect(consume.where.consumedAt).toBeNull();
    expect(consume.where.expiresAt).toEqual({ gt: expect.any(Date) });
    expect(tx.adminUser.create.mock.calls[0][0].data).toMatchObject({
      email: 'ed@example.com',
      role: 'CONTENT_EDITOR',
      passwordHash: 'hashed:a brand new passphrase',
      isActive: true,
    });
    const audit = auditLogMock.mock.calls[0][0];
    expect(audit).toMatchObject({ action: 'admin_user.invite_accepted', actorId: 'u-new' });
    expect(JSON.stringify(audit)).not.toContain('brand new');
  });

  it('rejects a token that was already used or expired (no row consumed)', async () => {
    tx.adminInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(acceptInvite('tok', 'a brand new passphrase', {})).rejects.toThrow(InvalidInviteError);
    expect(tx.adminUser.create).not.toHaveBeenCalled();
  });

  it('rejects when an account for the email appeared in the meantime', async () => {
    tx.adminUser.findUnique.mockResolvedValue({ id: 'x' });
    await expect(acceptInvite('tok', 'a brand new passphrase', {})).rejects.toThrow(InvalidInviteError);
    expect(tx.adminUser.create).not.toHaveBeenCalled();
  });
});

describe('updateAdminUser', () => {
  it('throws when the user does not exist', async () => {
    tx.adminUser.findUnique.mockResolvedValue(null);
    await expect(updateAdminUser('nope', { isActive: false }, ACTOR)).rejects.toThrow(
      AdminUserNotFoundError,
    );
  });

  it('refuses to let an admin deactivate themselves', async () => {
    tx.adminUser.findUnique.mockResolvedValue(row({ id: 'admin-1', role: 'ADMIN' }));
    await expect(updateAdminUser('admin-1', { isActive: false }, ACTOR)).rejects.toThrow(
      AdminUserRuleError,
    );
    expect(tx.adminUser.update).not.toHaveBeenCalled();
  });

  it('refuses to let an admin change their own role', async () => {
    tx.adminUser.findUnique.mockResolvedValue(row({ id: 'admin-1', role: 'ADMIN' }));
    await expect(updateAdminUser('admin-1', { role: 'CONTENT_EDITOR' }, ACTOR)).rejects.toThrow(
      AdminUserRuleError,
    );
  });

  it('refuses to demote or deactivate the last active ADMIN', async () => {
    tx.adminUser.findUnique.mockResolvedValue(row({ role: 'ADMIN' }));
    tx.adminUser.count.mockResolvedValue(1);
    await expect(updateAdminUser('u-2', { role: 'CONTENT_EDITOR' }, ACTOR)).rejects.toThrow(
      AdminUserRuleError,
    );
    await expect(updateAdminUser('u-2', { isActive: false }, ACTOR)).rejects.toThrow(
      AdminUserRuleError,
    );
  });

  it('deactivates, invalidates sessions, and audits', async () => {
    tx.adminUser.findUnique.mockResolvedValue(row());
    tx.adminUser.update.mockResolvedValue(row({ isActive: false }));
    await updateAdminUser('u-2', { isActive: false }, ACTOR);
    expect(invalidateAllMock).toHaveBeenCalledWith('u-2');
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin_user.updated', entityId: 'u-2' }),
      expect.anything(),
    );
  });

  it('changes role and invalidates sessions', async () => {
    tx.adminUser.findUnique.mockResolvedValue(row());
    tx.adminUser.update.mockResolvedValue(row({ role: 'ADMIN' }));
    await updateAdminUser('u-2', { role: 'ADMIN' }, ACTOR);
    expect(tx.adminUser.update.mock.calls[0][0].data).toEqual({ role: 'ADMIN' });
    expect(invalidateAllMock).toHaveBeenCalledWith('u-2');
  });

  it('resets the password: hashes, clears lockout, invalidates sessions, never audits the password', async () => {
    tx.adminUser.findUnique.mockResolvedValue(row());
    tx.adminUser.update.mockResolvedValue(row());
    await updateAdminUser('u-2', { password: 'a brand new passphrase' }, ACTOR);
    expect(tx.adminUser.update.mock.calls[0][0].data).toEqual({
      passwordHash: 'hashed:a brand new passphrase',
      failedLoginCount: 0,
      lockedUntil: null,
    });
    expect(invalidateAllMock).toHaveBeenCalledWith('u-2');
    expect(JSON.stringify(auditLogMock.mock.calls[0][0])).not.toContain('brand new');
  });
});

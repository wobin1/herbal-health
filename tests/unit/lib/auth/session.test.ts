import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  adminSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const { createSession, verifySessionToken, rotateSession, invalidateAllSessionsForUser } =
  await import('@/lib/auth/session');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sessions', () => {
  it('creates a session record and returns an opaque token distinct from the stored hash', async () => {
    prismaMock.adminSession.create.mockResolvedValue({});
    const { token, expiresAt } = await createSession('admin-1');

    expect(token).toBeTruthy();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    const [[call]] = prismaMock.adminSession.create.mock.calls;
    expect(call.data.tokenHash).not.toBe(token);
    expect(call.data.adminUserId).toBe('admin-1');
  });

  it('returns null for an unknown or expired session', async () => {
    prismaMock.adminSession.findUnique.mockResolvedValue(null);
    await expect(verifySessionToken('bogus')).resolves.toBeNull();
  });

  it('rejects a session belonging to a deactivated admin', async () => {
    prismaMock.adminSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      expiresAt: new Date(Date.now() + 60_000),
      adminUser: { id: 'admin-1', email: 'a@b.com', role: 'ADMIN', isActive: false },
    });
    await expect(verifySessionToken('token')).resolves.toBeNull();
  });

  it('rotate invalidates the old token and issues a new one', async () => {
    prismaMock.adminSession.create.mockResolvedValue({});
    await rotateSession('old-token', 'admin-1');

    expect(prismaMock.adminSession.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String) },
    });
    expect(prismaMock.adminSession.create).toHaveBeenCalledTimes(1);
  });

  it('invalidates every session for a user on demand', async () => {
    await invalidateAllSessionsForUser('admin-1');
    expect(prismaMock.adminSession.deleteMany).toHaveBeenCalledWith({ where: { adminUserId: 'admin-1' } });
  });
});

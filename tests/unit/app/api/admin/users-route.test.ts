import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePermissionMock = vi.fn();
vi.mock('@/lib/auth/require-admin', () => ({
  requirePermission: requirePermissionMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

class AdminUserNotFoundError extends Error {}
class AdminUserConflictError extends Error {}
class AdminUserRuleError extends Error {}
class InviteNotFoundError extends Error {}
class InviteDeliveryError extends Error {}
const inviteAdminUserMock = vi.fn();
const revokeAdminInviteMock = vi.fn();
const updateAdminUserMock = vi.fn();
const listAdminUsersMock = vi.fn();
vi.mock('@/server/services/admin-user-service', () => ({
  inviteAdminUser: inviteAdminUserMock,
  revokeAdminInvite: revokeAdminInviteMock,
  InviteNotFoundError,
  InviteDeliveryError,
  updateAdminUser: updateAdminUserMock,
  listAdminUsers: listAdminUsersMock,
  AdminUserNotFoundError,
  AdminUserConflictError,
  AdminUserRuleError,
}));

const { GET, POST } = await import('@/app/api/admin/users/route');
const { PATCH } = await import('@/app/api/admin/users/[id]/route');
const { DELETE: REVOKE } = await import('@/app/api/admin/user-invites/[id]/route');

function req(body?: unknown) {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.1' }),
    nextUrl: new URL('http://localhost/api/admin/users'),
    json: async () => body,
  } as unknown as import('next/server').NextRequest;
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as unknown as Parameters<typeof PATCH>[1];

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ adminUser: { id: 'admin-1' } });
});

describe('admin users routes', () => {
  it('requires the users:manage permission', async () => {
    const { ForbiddenError } = await import('@/lib/auth/require-admin');
    requirePermissionMock.mockRejectedValue(new ForbiddenError());
    expect((await GET(req())).status).toBe(403);
    expect(requirePermissionMock).toHaveBeenCalledWith('users:manage');
    expect((await POST(req({}))).status).toBe(403);
    expect((await PATCH(req({}), ctx('u'))).status).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    const { UnauthorizedError } = await import('@/lib/auth/require-admin');
    requirePermissionMock.mockRejectedValue(new UnauthorizedError());
    expect((await POST(req({}))).status).toBe(401);
  });

  it('POST validates input: bad email, unknown role, and no password accepted', async () => {
    for (const body of [
      { email: 'nope', role: 'ADMIN' },
      { email: 'a@b.co', role: 'ROOT' },
      { email: 'a@b.co', role: 'ADMIN', password: 'long enough passphrase' },
    ]) {
      expect((await POST(req(body))).status).toBe(400);
    }
    expect(inviteAdminUserMock).not.toHaveBeenCalled();
  });

  it('POST sends an invite and returns 201; maps errors to 409 and 503', async () => {
    const body = { email: 'A@B.co', role: 'CONTENT_EDITOR' };
    inviteAdminUserMock.mockResolvedValue({ id: 'inv-1', email: 'a@b.co' });
    expect((await POST(req(body))).status).toBe(201);
    expect(inviteAdminUserMock.mock.calls[0][0].email).toBe('a@b.co');
    inviteAdminUserMock.mockRejectedValueOnce(new AdminUserConflictError());
    expect((await POST(req(body))).status).toBe(409);
    inviteAdminUserMock.mockRejectedValueOnce(new InviteDeliveryError());
    expect((await POST(req(body))).status).toBe(503);
  });

  it('DELETE user-invites requires permission and maps not-found to 404', async () => {
    revokeAdminInviteMock.mockResolvedValueOnce(undefined);
    expect((await REVOKE(req(), ctx('inv-1') as never)).status).toBe(200);
    revokeAdminInviteMock.mockRejectedValueOnce(new InviteNotFoundError());
    expect((await REVOKE(req(), ctx('inv-1') as never)).status).toBe(404);
  });

  it('PATCH rejects an empty or unknown-field payload', async () => {
    expect((await PATCH(req({}), ctx('u-2'))).status).toBe(400);
    expect((await PATCH(req({ role: 'ADMIN', passwordHash: 'x' }), ctx('u-2'))).status).toBe(400);
  });

  it('PATCH maps service errors to 404 and 422', async () => {
    updateAdminUserMock.mockRejectedValueOnce(new AdminUserNotFoundError());
    expect((await PATCH(req({ isActive: false }), ctx('u-2'))).status).toBe(404);
    updateAdminUserMock.mockRejectedValueOnce(new AdminUserRuleError());
    expect((await PATCH(req({ isActive: false }), ctx('u-2'))).status).toBe(422);
  });

  it('PATCH never echoes the password back', async () => {
    updateAdminUserMock.mockResolvedValue({ id: 'u-2', email: 'a@b.co' });
    const res = await PATCH(req({ password: 'a brand new passphrase' }), ctx('u-2'));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain('brand new');
  });
});

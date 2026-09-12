import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePermissionMock = vi.fn();
vi.mock('@/lib/auth/require-admin', () => ({
  requirePermission: requirePermissionMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

const markContactMessageReadMock = vi.fn();
const deleteContactMessageMock = vi.fn();
class ContactMessageNotFoundError extends Error {}
vi.mock('@/server/services/contact-message-service', () => ({
  markContactMessageRead: markContactMessageReadMock,
  deleteContactMessage: deleteContactMessageMock,
  ContactMessageNotFoundError,
}));

const { PATCH, DELETE } = await import('@/app/api/admin/contact-messages/[id]/route');

function ctx(id: string) {
  return { params: Promise.resolve({ id }) } as unknown as Parameters<typeof PATCH>[1];
}

function request(ip = '203.0.113.1') {
  return { headers: new Headers({ 'x-forwarded-for': ip }) } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ adminUser: { id: 'admin-1' } });
});

describe('PATCH /api/admin/contact-messages/[id]', () => {
  it('rejects unauthenticated requests', async () => {
    const { UnauthorizedError } = await import('@/lib/auth/require-admin');
    requirePermissionMock.mockRejectedValue(new UnauthorizedError());
    const response = await PATCH(request(), ctx('msg-1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when the message does not exist', async () => {
    markContactMessageReadMock.mockRejectedValue(new ContactMessageNotFoundError());
    const response = await PATCH(request(), ctx('missing'));
    expect(response.status).toBe(404);
  });

  it('marks the message as read', async () => {
    markContactMessageReadMock.mockResolvedValue({ id: 'msg-1', isRead: true });
    const response = await PATCH(request(), ctx('msg-1'));
    expect(response.status).toBe(200);
    expect(markContactMessageReadMock).toHaveBeenCalledWith('msg-1', { actorId: 'admin-1', ipAddress: '203.0.113.1' });
  });
});

describe('DELETE /api/admin/contact-messages/[id]', () => {
  it('returns 404 when the message does not exist', async () => {
    deleteContactMessageMock.mockRejectedValue(new ContactMessageNotFoundError());
    const response = await DELETE(request(), ctx('missing'));
    expect(response.status).toBe(404);
  });

  it('deletes the message', async () => {
    deleteContactMessageMock.mockResolvedValue(undefined);
    const response = await DELETE(request(), ctx('msg-1'));
    expect(response.status).toBe(200);
    expect(deleteContactMessageMock).toHaveBeenCalledWith('msg-1', { actorId: 'admin-1', ipAddress: '203.0.113.1' });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePermissionMock = vi.fn();
vi.mock('@/lib/auth/require-admin', () => ({
  requirePermission: requirePermissionMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

const listContactMessagesMock = vi.fn();
vi.mock('@/server/services/contact-message-service', () => ({
  listContactMessages: listContactMessagesMock,
}));

const { GET } = await import('@/app/api/admin/contact-messages/route');
const { UnauthorizedError, ForbiddenError } = await import('@/lib/auth/require-admin');

function fakeRequest(url = 'https://admin.example.com/api/admin/contact-messages') {
  return { nextUrl: new URL(url) } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ adminUser: { id: 'admin-1' } });
});

describe('GET /api/admin/contact-messages', () => {
  it('rejects unauthenticated requests', async () => {
    requirePermissionMock.mockRejectedValue(new UnauthorizedError());
    const response = await GET(fakeRequest());
    expect(response.status).toBe(401);
  });

  it('rejects requests without permission', async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError());
    const response = await GET(fakeRequest());
    expect(response.status).toBe(403);
  });

  it('returns messages and the unread count', async () => {
    listContactMessagesMock.mockResolvedValue({
      items: [{ id: 'msg-1' }],
      unreadCount: 1,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    const response = await GET(fakeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.messages).toEqual([{ id: 'msg-1' }]);
    expect(body.unreadCount).toBe(1);
  });

  it('passes page params from the query string', async () => {
    listContactMessagesMock.mockResolvedValue({
      items: [],
      unreadCount: 0,
      page: 2,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
    await GET(fakeRequest('https://admin.example.com/api/admin/contact-messages?page=2'));
    expect(listContactMessagesMock).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
  });
});

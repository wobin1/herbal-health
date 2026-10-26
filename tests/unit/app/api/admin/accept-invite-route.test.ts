import { beforeEach, describe, expect, it, vi } from 'vitest';

class InvalidInviteError extends Error {}
const acceptInviteMock = vi.fn();
vi.mock('@/server/services/admin-user-service', () => ({
  acceptInvite: acceptInviteMock,
  InvalidInviteError,
}));

const { POST } = await import('@/app/api/admin/accept-invite/route');

let ipCounter = 0;
function req(body: unknown, ip = `198.51.100.${++ipCounter}`) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    headers: new Headers({ 'x-forwarded-for': ip }),
    text: async () => raw,
  } as unknown as import('next/server').NextRequest;
}

const GOOD = { token: 'tok_123', password: 'a brand new passphrase' };

beforeEach(() => vi.clearAllMocks());

describe('POST /api/admin/accept-invite', () => {
  it('creates the account for a valid token', async () => {
    acceptInviteMock.mockResolvedValue(undefined);
    const res = await POST(req(GOOD));
    expect(res.status).toBe(201);
    expect(acceptInviteMock.mock.calls[0].slice(0, 2)).toEqual(['tok_123', GOOD.password]);
  });

  it('rejects short passwords and malformed bodies before touching the service', async () => {
    expect((await POST(req({ ...GOOD, password: 'short' }))).status).toBe(400);
    expect((await POST(req('not json'))).status).toBe(400);
    expect((await POST(req({ password: GOOD.password }))).status).toBe(400);
    expect(acceptInviteMock).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies', async () => {
    expect((await POST(req({ ...GOOD, token: 'x'.repeat(10_000) }))).status).toBe(413);
  });

  it('returns one generic 400 for any invalid/used/expired token', async () => {
    acceptInviteMock.mockRejectedValue(new InvalidInviteError());
    const res = await POST(req(GOOD));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_INVITE');
  });

  it('rate-limits repeated attempts from one client', async () => {
    acceptInviteMock.mockRejectedValue(new InvalidInviteError());
    const ip = '203.0.113.99';
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await POST(req(GOOD, ip))).status;
    expect(last).toBe(429);
  });
});

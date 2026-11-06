import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePermissionMock = vi.fn();
vi.mock('@/lib/auth/require-admin', () => ({
  requirePermission: requirePermissionMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

class EventNotFoundError extends Error {}
class EventValidationError extends Error {}
class EventSlugConflictError extends Error {}
class EventLocationNotFoundError extends Error {}
const createEventMock = vi.fn();
const updateEventMock = vi.fn();
vi.mock('@/server/services/event-service', () => ({
  createEvent: createEventMock,
  updateEvent: updateEventMock,
  listAdminEvents: vi.fn(),
  getAdminEventById: vi.fn(),
  deleteEvent: vi.fn(),
  EventNotFoundError,
  EventValidationError,
  EventSlugConflictError,
  EventLocationNotFoundError,
}));

const { POST } = await import('@/app/api/admin/events/route');
const { PATCH } = await import('@/app/api/admin/events/[id]/route');

const VALID_BODY = {
  slug: 'herbal-101',
  title: 'Herbal 101',
  shortDescription: 'Short',
  startAt: '2026-01-01T00:00:00Z',
  timezone: 'America/New_York',
  city: 'Austin',
  state: 'TX',
};

function req(body: unknown) {
  return {
    headers: new Headers(),
    nextUrl: new URL('http://localhost/api/admin/events'),
    json: async () => body,
  } as unknown as import('next/server').NextRequest;
}
const ctx = { params: Promise.resolve({ id: 'evt-1' }) } as unknown as Parameters<typeof PATCH>[1];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  requirePermissionMock.mockResolvedValue({ adminUser: { id: 'admin-1' } });
});

describe('POST /api/admin/events', () => {
  it('returns 409 SLUG_TAKEN when the slug is already used', async () => {
    createEventMock.mockRejectedValue(new EventSlugConflictError());
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('SLUG_TAKEN');
  });

  it('returns 400 LOCATION_NOT_FOUND when the location does not exist', async () => {
    createEventMock.mockRejectedValue(new EventLocationNotFoundError());
    const res = await POST(req({ ...VALID_BODY, locationId: 'gone' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('LOCATION_NOT_FOUND');
  });

  it('logs unexpected errors server-side and returns a generic 500', async () => {
    const boom = new Error('db down');
    createEventMock.mockRejectedValue(boom);
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.message).toBe('Unable to create event');
    expect(JSON.stringify(json)).not.toContain('db down');
    expect(console.error).toHaveBeenCalledWith(expect.any(String), boom);
  });
});

describe('PATCH /api/admin/events/[id]', () => {
  it('returns 409 SLUG_TAKEN when the slug is already used', async () => {
    updateEventMock.mockRejectedValue(new EventSlugConflictError());
    const res = await PATCH(req({ slug: 'taken' }), ctx);
    expect(res.status).toBe(409);
  });

  it('returns 400 LOCATION_NOT_FOUND when the location does not exist', async () => {
    updateEventMock.mockRejectedValue(new EventLocationNotFoundError());
    const res = await PATCH(req({ locationId: 'gone' }), ctx);
    expect(res.status).toBe(400);
  });
});

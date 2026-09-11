import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  event: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const {
  listPublicEvents,
  getPublicEventBySlug,
  publishEvent,
  cancelEvent,
  completeEvent,
  closeSales,
  deleteEvent,
  EventValidationError,
  EventNotFoundError,
} = await import('@/server/services/event-service');

const ACTOR = { actorId: 'admin-1', ipAddress: '127.0.0.1' };

const COMPLETE_EVENT = {
  id: 'evt-1',
  slug: 'herbal-101',
  title: 'Herbal 101',
  shortDescription: 'Short',
  longDescription: 'Long',
  startAt: new Date('2026-01-01T00:00:00Z'),
  endAt: new Date('2026-01-01T02:00:00Z'),
  timezone: 'America/New_York',
  locationId: 'loc-1',
  coverImageUrl: 'https://example.com/cover.jpg',
  status: 'DRAFT',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPublicEvents', () => {
  it('only queries publicly visible statuses', async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    await listPublicEvents({});
    const call = prismaMock.event.findMany.mock.calls[0][0];
    expect(call.where.status.in).toEqual(['COMING_SOON', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT', 'CLOSED', 'CANCELLED', 'COMPLETED']);
  });

  it('applies keyword, city, state, and date filters', async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    await listPublicEvents({
      keyword: 'herbal',
      city: 'Austin',
      state: 'TX',
      dateFrom: new Date('2026-01-01'),
      dateTo: new Date('2026-02-01'),
    });
    const call = prismaMock.event.findMany.mock.calls[0][0];
    expect(call.where.city).toBe('Austin');
    expect(call.where.state).toBe('TX');
    expect(call.where.startAt.gte).toEqual(new Date('2026-01-01'));
    expect(call.where.startAt.lte).toEqual(new Date('2026-02-01'));
    expect(call.where.OR).toBeDefined();
  });
});

describe('getPublicEventBySlug', () => {
  it('returns null when the event is not publicly visible', async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);
    const event = await getPublicEventBySlug('draft-event');
    expect(event).toBeNull();
  });

  it('returns the event when publicly visible', async () => {
    prismaMock.event.findFirst.mockResolvedValue({ ...COMPLETE_EVENT, status: 'ON_SALE' });
    const event = await getPublicEventBySlug('herbal-101');
    expect(event?.slug).toBe('herbal-101');
  });
});

describe('publishEvent', () => {
  it('throws EventValidationError listing missing required fields', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, longDescription: null, coverImageUrl: null });
    await expect(publishEvent('evt-1', ACTOR)).rejects.toThrow(EventValidationError);
    try {
      await publishEvent('evt-1', ACTOR);
    } catch (error) {
      expect(error).toBeInstanceOf(EventValidationError);
      expect((error as InstanceType<typeof EventValidationError>).missingFields).toEqual(
        expect.arrayContaining(['longDescription', 'coverImageUrl']),
      );
    }
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it('throws EventNotFoundError when the event does not exist', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    await expect(publishEvent('missing', ACTOR)).rejects.toThrow(EventNotFoundError);
  });

  it('publishes and records an audit log when all required fields are present', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'PUBLISHED' });
    const result = await publishEvent('evt-1', ACTOR);
    expect(result.status).toBe('PUBLISHED');
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { status: 'PUBLISHED' },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event.published', entityType: 'Event', entityId: 'evt-1' }),
    );
  });
});

describe('cancelEvent', () => {
  it('sets status to CANCELLED and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'CANCELLED' });
    const result = await cancelEvent('evt-1', ACTOR);
    expect(result.status).toBe('CANCELLED');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.cancelled' }));
  });
});

describe('completeEvent', () => {
  it('sets status to COMPLETED and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'COMPLETED' });
    const result = await completeEvent('evt-1', ACTOR);
    expect(result.status).toBe('COMPLETED');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.completed' }));
  });
});

describe('closeSales', () => {
  it('sets status to CLOSED and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'CLOSED' });
    const result = await closeSales('evt-1', ACTOR);
    expect(result.status).toBe('CLOSED');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.closed' }));
  });
});

describe('deleteEvent', () => {
  it('refuses to delete a non-draft event', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'PUBLISHED' });
    await expect(deleteEvent('evt-1', ACTOR)).rejects.toThrow(EventValidationError);
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
  });

  it('deletes a DRAFT event and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'DRAFT' });
    prismaMock.event.delete.mockResolvedValue(COMPLETE_EVENT);
    await deleteEvent('evt-1', ACTOR);
    expect(prismaMock.event.delete).toHaveBeenCalledWith({ where: { id: 'evt-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.deleted' }));
  });
});

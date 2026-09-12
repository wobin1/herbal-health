import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  event: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  eventTicketType: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  registration: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const enqueueEmailMock = vi.fn();
vi.mock('@/server/services/email-queue-service', () => ({ enqueueEmail: enqueueEmailMock }));

const {
  listPublicEvents,
  getPublicEventBySlug,
  publishEvent,
  cancelEvent,
  completeEvent,
  closeSales,
  startSales,
  deleteEvent,
  createTicketType,
  updateTicketType,
  deleteTicketType,
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
  const PAGE_1 = { page: 1, pageSize: 6 };

  beforeEach(() => {
    prismaMock.event.count.mockResolvedValue(0);
  });

  it('only queries publicly visible statuses', async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    await listPublicEvents({}, PAGE_1);
    const call = prismaMock.event.findMany.mock.calls[0][0];
    expect(call.where.status.in).toEqual(['COMING_SOON', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT', 'CLOSED', 'CANCELLED', 'COMPLETED']);
  });

  it('applies keyword, city, state, and date filters', async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    await listPublicEvents(
      {
        keyword: 'herbal',
        city: 'Austin',
        state: 'TX',
        dateFrom: new Date('2026-01-01'),
        dateTo: new Date('2026-02-01'),
      },
      PAGE_1,
    );
    const call = prismaMock.event.findMany.mock.calls[0][0];
    expect(call.where.city).toBe('Austin');
    expect(call.where.state).toBe('TX');
    expect(call.where.startAt.gte).toEqual(new Date('2026-01-01'));
    expect(call.where.startAt.lte).toEqual(new Date('2026-02-01'));
    expect(call.where.OR).toBeDefined();
  });

  it('applies skip/take derived from the page params and the same filters to the count', async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    await listPublicEvents({ city: 'Austin' }, { page: 3, pageSize: 6 });
    const findManyCall = prismaMock.event.findMany.mock.calls[0][0];
    expect(findManyCall.skip).toBe(12);
    expect(findManyCall.take).toBe(6);
    const countCall = prismaMock.event.count.mock.calls[0][0];
    expect(countCall.where.city).toBe('Austin');
  });

  it('returns a page result with items, page, pageSize, total, and totalPages', async () => {
    const events = [{ ...COMPLETE_EVENT, status: 'ON_SALE' }];
    prismaMock.event.findMany.mockResolvedValue(events);
    prismaMock.event.count.mockResolvedValue(13);
    const result = await listPublicEvents({}, { page: 2, pageSize: 6 });
    expect(result).toEqual({ items: events, page: 2, pageSize: 6, total: 13, totalPages: 3 });
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
  it('refuses to cancel an event that is already CANCELLED or COMPLETED', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'COMPLETED' });
    await expect(cancelEvent('evt-1', ACTOR)).rejects.toThrow(EventValidationError);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it('sets status to CANCELLED and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'CANCELLED', city: 'Austin', state: 'TX' });
    const result = await cancelEvent('evt-1', ACTOR);
    expect(result.status).toBe('CANCELLED');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.cancelled' }));
  });

  it('notifies every confirmed registrant of the cancellation', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    const cancelled = { ...COMPLETE_EVENT, status: 'CANCELLED', city: 'Austin', state: 'TX' };
    prismaMock.event.update.mockResolvedValue(cancelled);
    prismaMock.registration.findMany.mockResolvedValueOnce([
      { id: 'reg-1', reference: 'HHS-2026-ABCDEF', attendee: { firstName: 'Jane', email: 'jane@example.com' } },
    ]);

    await cancelEvent('evt-1', ACTOR);

    expect(prismaMock.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'evt-1', status: 'CONFIRMED' } }),
    );
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ type: 'EVENT_CANCELLATION', toEmail: 'jane@example.com' }),
    );
  });
});

describe('completeEvent', () => {
  it('refuses to complete an event that has never gone on sale', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'DRAFT' });
    await expect(completeEvent('evt-1', ACTOR)).rejects.toThrow(EventValidationError);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it('sets status to COMPLETED and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'ON_SALE' });
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'COMPLETED' });
    const result = await completeEvent('evt-1', ACTOR);
    expect(result.status).toBe('COMPLETED');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.completed' }));
  });

  it('allows completing an event whose sales were already closed', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'CLOSED' });
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'COMPLETED' });
    const result = await completeEvent('evt-1', ACTOR);
    expect(result.status).toBe('COMPLETED');
  });
});

describe('closeSales', () => {
  it('refuses to close sales on an event that is not ON_SALE', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'PUBLISHED' });
    await expect(closeSales('evt-1', ACTOR)).rejects.toThrow(EventValidationError);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it('sets status to CLOSED and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'ON_SALE' });
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'CLOSED' });
    const result = await closeSales('evt-1', ACTOR);
    expect(result.status).toBe('CLOSED');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.closed' }));
  });
});

describe('startSales', () => {
  it('refuses to start sales on an event that is not PUBLISHED', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'DRAFT' });
    await expect(startSales('evt-1', ACTOR)).rejects.toThrow(EventValidationError);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it('sets status to ON_SALE and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue({ ...COMPLETE_EVENT, status: 'PUBLISHED' });
    prismaMock.event.update.mockResolvedValue({ ...COMPLETE_EVENT, status: 'ON_SALE' });
    const result = await startSales('evt-1', ACTOR);
    expect(result.status).toBe('ON_SALE');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.sales_started' }));
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

const TICKET_TYPE = {
  id: 'tt-1',
  eventId: 'evt-1',
  name: 'General Admission',
  priceMinorUnits: 4500,
  currency: 'USD',
  capacity: 50,
  sortOrder: 0,
};

describe('createTicketType', () => {
  it('rejects when the event does not exist', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    await expect(
      createTicketType('evt-missing', { name: 'GA', priceMinorUnits: 100, capacity: 10 }, ACTOR),
    ).rejects.toThrow(EventNotFoundError);
    expect(prismaMock.eventTicketType.create).not.toHaveBeenCalled();
  });

  it('creates a ticket type scoped to the event and records an audit log', async () => {
    prismaMock.event.findUnique.mockResolvedValue(COMPLETE_EVENT);
    prismaMock.eventTicketType.create.mockResolvedValue(TICKET_TYPE);
    const result = await createTicketType(
      'evt-1',
      { name: 'General Admission', priceMinorUnits: 4500, capacity: 50 },
      ACTOR,
    );
    expect(prismaMock.eventTicketType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventId: 'evt-1', name: 'General Admission', priceMinorUnits: 4500 }),
    });
    expect(result).toEqual(TICKET_TYPE);
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.ticket_type.created' }));
  });
});

describe('updateTicketType', () => {
  it('rejects when the ticket type does not belong to the given event', async () => {
    prismaMock.eventTicketType.findUnique.mockResolvedValue({ ...TICKET_TYPE, eventId: 'other-event' });
    await expect(updateTicketType('evt-1', 'tt-1', { capacity: 60 }, ACTOR)).rejects.toThrow(EventNotFoundError);
    expect(prismaMock.eventTicketType.update).not.toHaveBeenCalled();
  });

  it('updates price/capacity and records an audit log', async () => {
    prismaMock.eventTicketType.findUnique.mockResolvedValue(TICKET_TYPE);
    prismaMock.eventTicketType.update.mockResolvedValue({ ...TICKET_TYPE, priceMinorUnits: 5000, capacity: 60 });
    const result = await updateTicketType('evt-1', 'tt-1', { priceMinorUnits: 5000, capacity: 60 }, ACTOR);
    expect(result.priceMinorUnits).toBe(5000);
    expect(result.capacity).toBe(60);
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.ticket_type.updated' }));
  });
});

describe('deleteTicketType', () => {
  it('rejects when the ticket type does not belong to the given event', async () => {
    prismaMock.eventTicketType.findUnique.mockResolvedValue({ ...TICKET_TYPE, eventId: 'other-event' });
    await expect(deleteTicketType('evt-1', 'tt-1', ACTOR)).rejects.toThrow(EventNotFoundError);
    expect(prismaMock.eventTicketType.delete).not.toHaveBeenCalled();
  });

  it('deletes the ticket type and records an audit log', async () => {
    prismaMock.eventTicketType.findUnique.mockResolvedValue(TICKET_TYPE);
    prismaMock.eventTicketType.delete.mockResolvedValue(TICKET_TYPE);
    await deleteTicketType('evt-1', 'tt-1', ACTOR);
    expect(prismaMock.eventTicketType.delete).toHaveBeenCalledWith({ where: { id: 'tt-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.ticket_type.deleted' }));
  });
});

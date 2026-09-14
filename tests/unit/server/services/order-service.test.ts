import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  $transaction: vi.fn(),
  order: { update: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const {
  createPendingOrder,
  attachCheckoutSession,
  listOrders,
  getOrderDetail,
  OrderNotFoundError,
  TicketTypeNotFoundError,
  EventNotOnSaleError,
} = await import('@/server/services/order-service');
const { InsufficientInventoryError } = await import('@/server/services/inventory-service');

const BASE_REQUEST = {
  eventId: 'evt-1',
  ticketTypeId: 'tt-1',
  quantity: 1,
  buyerEmail: 'jane@example.com',
  buyerName: 'Jane Doe',
  buyerPhone: '555-0100',
  buyerCountry: 'US',
  termsVersion: '2026-01-01',
};

function makeTx(ticketType: Record<string, unknown> | null) {
  return {
    eventTicketType: {
      findUnique: vi.fn().mockResolvedValue(ticketType),
      update: vi.fn().mockResolvedValue({}),
    },
    order: {
      create: vi.fn().mockResolvedValue({
        id: 'order-1',
        items: [{ id: 'item-1' }],
      }),
    },
    attendee: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createPendingOrder', () => {
  it('never trusts a client-supplied price/total — total is computed from EventTicketType.priceMinorUnits', async () => {
    const tx = makeTx({
      id: 'tt-1',
      eventId: 'evt-1',
      priceMinorUnits: 5000,
      currency: 'USD',
      capacity: 10,
      reservedCount: 0,
      soldCount: 0,
      event: { status: 'ON_SALE' },
    });
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await createPendingOrder({ ...BASE_REQUEST, quantity: 2 } as never, { ipAddress: '127.0.0.1' });

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalMinorUnits: 10000, // 5000 * 2, server-computed — request carries no price field
          items: { create: expect.objectContaining({ unitPriceMinorUnits: 5000, subtotalMinorUnits: 10000 }) },
        }),
      }),
    );
  });

  it('creates one Attendee/registration-eligible row per ticket, populated from the buyer — no separate per-attendee form', async () => {
    const tx = makeTx({
      id: 'tt-1',
      eventId: 'evt-1',
      priceMinorUnits: 5000,
      currency: 'USD',
      capacity: 10,
      reservedCount: 0,
      soldCount: 0,
      event: { status: 'ON_SALE' },
    });
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await createPendingOrder({ ...BASE_REQUEST, quantity: 3 } as never, { ipAddress: '127.0.0.1' });

    expect(tx.attendee.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orderId: 'order-1',
          orderItemId: 'item-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '555-0100',
          country: 'US',
        }),
        expect.objectContaining({ orderId: 'order-1', orderItemId: 'item-1' }),
        expect.objectContaining({ orderId: 'order-1', orderItemId: 'item-1' }),
      ],
    });
    expect((tx.attendee.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0].data).toHaveLength(3);
  });

  it('throws TicketTypeNotFoundError when the ticket type does not belong to the event', async () => {
    const tx = makeTx({ id: 'tt-1', eventId: 'other-event', event: { status: 'ON_SALE' } });
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));
    await expect(createPendingOrder(BASE_REQUEST as never, {})).rejects.toThrow(TicketTypeNotFoundError);
  });

  it('throws EventNotOnSaleError when the event status is not published/on-sale', async () => {
    const tx = makeTx({
      id: 'tt-1',
      eventId: 'evt-1',
      priceMinorUnits: 100,
      capacity: 10,
      reservedCount: 0,
      soldCount: 0,
      event: { status: 'DRAFT' },
    });
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));
    await expect(createPendingOrder(BASE_REQUEST as never, {})).rejects.toThrow(EventNotOnSaleError);
  });

  it('throws InsufficientInventoryError when capacity is exhausted', async () => {
    const tx = makeTx({
      id: 'tt-1',
      eventId: 'evt-1',
      priceMinorUnits: 100,
      currency: 'USD',
      capacity: 5,
      reservedCount: 5,
      soldCount: 0,
      event: { status: 'ON_SALE' },
    });
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));
    await expect(createPendingOrder(BASE_REQUEST as never, {})).rejects.toThrow(InsufficientInventoryError);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('records a term acceptance and an audit log entry', async () => {
    const tx = makeTx({
      id: 'tt-1',
      eventId: 'evt-1',
      priceMinorUnits: 100,
      currency: 'USD',
      capacity: 10,
      reservedCount: 0,
      soldCount: 0,
      event: { status: 'ON_SALE' },
    });
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));
    await createPendingOrder(BASE_REQUEST as never, { ipAddress: '10.0.0.1' });
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          termAcceptances: { create: { termsVersion: '2026-01-01', ipAddress: '10.0.0.1' } },
        }),
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'order.created' }), tx);
  });
});

describe('attachCheckoutSession', () => {
  it('updates the order with the provider checkout session id', async () => {
    await attachCheckoutSession('order-1', 'cs_test_123');
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { stripeCheckoutSessionId: 'cs_test_123' },
    });
  });
});

describe('listOrders', () => {
  it('filters by status and buyer email when provided', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.order.count.mockResolvedValue(0);
    await listOrders({ status: 'PAID', buyerEmail: 'jane@example.com' }, { page: 1, pageSize: 20 });
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PAID', buyerEmail: { equals: 'jane@example.com', mode: 'insensitive' } },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('returns all orders when no filters are given', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.order.count.mockResolvedValue(0);
    await listOrders({}, { page: 1, pageSize: 20 });
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('paginates using the given page and page size', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.order.count.mockResolvedValue(45);
    const result = await listOrders({}, { page: 2, pageSize: 20 });
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
    expect(result.total).toBe(45);
    expect(result.totalPages).toBe(3);
  });
});

describe('getOrderDetail', () => {
  it('throws OrderNotFoundError when the order does not exist', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(getOrderDetail('missing')).rejects.toThrow(OrderNotFoundError);
  });

  it('returns the order with items, attendees, registrations, and payments', async () => {
    const order = { id: 'order-1' };
    prismaMock.order.findUnique.mockResolvedValue(order);
    const result = await getOrderDetail('order-1');
    expect(result).toBe(order);
    expect(prismaMock.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        include: expect.objectContaining({
          items: expect.anything(),
          payments: true,
          registrations: expect.anything(),
        }),
      }),
    );
  });
});

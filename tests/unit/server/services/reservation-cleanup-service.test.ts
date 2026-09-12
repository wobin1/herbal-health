import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  order: { findMany: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const { expireStaleReservations } = await import('@/server/services/reservation-cleanup-service');

function makeTx(order: Record<string, unknown>) {
  return {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockResolvedValue({}),
    },
    eventTicketType: { update: vi.fn().mockResolvedValue({}) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('expireStaleReservations', () => {
  it('queries only PENDING orders whose reservation window has passed', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);
    const now = new Date('2026-01-01T00:00:00Z');
    await expireStaleReservations(now);
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING', reservationExpiresAt: { lte: now } },
      }),
    );
  });

  it('releases reserved inventory and transitions matching orders to EXPIRED', async () => {
    const staleOrder = {
      id: 'order-1',
      status: 'PENDING',
      items: [{ eventTicketTypeId: 'tt-1', quantity: 2 }],
    };
    prismaMock.order.findMany.mockResolvedValue([staleOrder]);
    const tx = makeTx(staleOrder);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    const result = await expireStaleReservations();

    expect(tx.eventTicketType.update).toHaveBeenCalledWith({
      where: { id: 'tt-1' },
      data: { reservedCount: { decrement: 2 } },
    });
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: 'EXPIRED' } });
    expect(result.expiredOrderIds).toEqual(['order-1']);
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'order.expired' }));
  });

  it('does not expire an order that was paid between the query and the transaction', async () => {
    const staleOrder = { id: 'order-1', status: 'PENDING', items: [{ eventTicketTypeId: 'tt-1', quantity: 2 }] };
    prismaMock.order.findMany.mockResolvedValue([staleOrder]);
    const tx = makeTx({ id: 'order-1', status: 'PAID' }); // re-checked status inside tx
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await expireStaleReservations();

    expect(tx.eventTicketType.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});

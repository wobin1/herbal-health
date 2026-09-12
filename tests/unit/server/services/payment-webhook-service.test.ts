import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  $transaction: vi.fn(),
  order: { findUnique: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const enqueueEmailMock = vi.fn();
vi.mock('@/server/services/email-queue-service', () => ({ enqueueEmail: enqueueEmailMock }));

const { processCheckoutCompleted, processCheckoutExpired, OrderNotFoundError } = await import(
  '@/server/services/payment-webhook-service'
);

const EVENT = {
  type: 'checkout.session.completed' as const,
  providerEventId: 'evt_stripe_1',
  checkoutSessionId: 'cs_test_1',
  orderId: 'order-1',
  paymentIntentId: 'pi_1',
  amountMinorUnits: 5000,
  currency: 'USD',
  raw: {},
};

function makeTx(order: Record<string, unknown> | null) {
  return {
    payment: { create: vi.fn().mockResolvedValue({}) },
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockResolvedValue({}),
    },
    eventTicketType: { update: vi.fn().mockResolvedValue({}) },
    registration: { create: vi.fn().mockResolvedValue({ reference: 'HHS-2026-ABCDEF' }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('processCheckoutCompleted', () => {
  it('pays the order, converts inventory, and creates one registration per attendee', async () => {
    const order = {
      id: 'order-1',
      eventId: 'evt-1',
      status: 'PENDING',
      buyerEmail: 'buyer@example.com',
      buyerName: 'Jane Doe',
      totalMinorUnits: 10000,
      currency: 'USD',
      event: { title: 'Herbal Basics', startAt: new Date('2026-06-01T00:00:00Z'), city: 'Austin', state: 'TX' },
      items: [
        {
          id: 'item-1',
          eventTicketTypeId: 'tt-1',
          quantity: 2,
          attendees: [
            { id: 'att-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
            { id: 'att-2', firstName: 'Jo', lastName: 'Roe', email: 'jo@example.com' },
          ],
        },
      ],
    };
    const tx = makeTx(order);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    const result = await processCheckoutCompleted(EVENT);

    expect(result.duplicate).toBe(false);
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerEventId: 'evt_stripe_1', status: 'SUCCEEDED' }),
      }),
    );
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: 'PAID' } });
    expect(tx.eventTicketType.update).toHaveBeenCalledWith({
      where: { id: 'tt-1' },
      data: { reservedCount: { decrement: 2 }, soldCount: { increment: 2 } },
    });
    expect(tx.registration.create).toHaveBeenCalledTimes(2);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ type: 'REGISTRATION_CONFIRMATION' }),
    );
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ type: 'PAYMENT_RECEIPT', toEmail: 'buyer@example.com' }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'order.paid' }));
  });

  it('throws OrderNotFoundError when the order referenced by the event does not exist', async () => {
    const tx = makeTx(null);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));
    await expect(processCheckoutCompleted(EVENT)).rejects.toThrow(OrderNotFoundError);
  });

  it('is a no-op (besides the idempotency gate) when the order is already PAID', async () => {
    const order = { id: 'order-1', eventId: 'evt-1', status: 'PAID', items: [] };
    const tx = makeTx(order);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));
    await processCheckoutCompleted(EVENT);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.registration.create).not.toHaveBeenCalled();
  });

  describe('duplicate delivery', () => {
    it('reports duplicate=true and performs no order/registration mutation when providerEventId already exists', async () => {
      const tx = makeTx({ id: 'order-1', eventId: 'evt-1', status: 'PENDING', items: [] });
      tx.payment.create = vi.fn().mockRejectedValue(
        Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
          meta: { target: ['providerEventId'] },
        }),
      );
      prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

      const result = await processCheckoutCompleted(EVENT);

      expect(result.duplicate).toBe(true);
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.registration.create).not.toHaveBeenCalled();
    });

    it('a second identical delivery never produces a second Payment or Registration (simulated concurrent duplicate)', async () => {
      // Simulates: two webhook deliveries race; the DB unique constraint on
      // providerEventId allows only the first to actually insert.
      let paymentCreated = false;
      const tx = makeTx({
        id: 'order-1',
        eventId: 'evt-1',
        status: 'PENDING',
        buyerEmail: 'buyer@example.com',
        buyerName: 'Jane Doe',
        totalMinorUnits: 5000,
        currency: 'USD',
        event: { title: 'Herbal Basics', startAt: new Date('2026-06-01T00:00:00Z'), city: 'Austin', state: 'TX' },
        items: [{ id: 'item-1', eventTicketTypeId: 'tt-1', quantity: 1, attendees: [{ id: 'att-1', firstName: 'A', lastName: 'B', email: 'a@example.com' }] }],
      });
      tx.payment.create = vi.fn().mockImplementation(async () => {
        if (paymentCreated) {
          throw Object.assign(new Error('Unique constraint failed'), {
            code: 'P2002',
            meta: { target: ['providerEventId'] },
          });
        }
        paymentCreated = true;
        return {};
      });
      prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

      const first = await processCheckoutCompleted(EVENT);
      const second = await processCheckoutCompleted(EVENT);

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(tx.payment.create).toHaveBeenCalledTimes(2);
      expect(tx.registration.create).toHaveBeenCalledTimes(1);
      expect(tx.order.update).toHaveBeenCalledTimes(1);
    });
  });
});

describe('processCheckoutExpired', () => {
  const EXPIRED_EVENT = {
    type: 'checkout.session.expired' as const,
    providerEventId: 'evt_expired_1',
    orderId: 'order-1',
    raw: {},
  };

  it('throws OrderNotFoundError when the order does not exist', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(processCheckoutExpired(EXPIRED_EVENT)).rejects.toThrow(OrderNotFoundError);
  });

  it('enqueues a payment failure email to the buyer', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      buyerEmail: 'buyer@example.com',
      buyerName: 'Jane Doe',
      event: { title: 'Herbal Basics', startAt: new Date('2026-06-01T00:00:00Z'), city: 'Austin', state: 'TX' },
    });

    await processCheckoutExpired(EXPIRED_EVENT);

    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        type: 'PAYMENT_FAILURE',
        toEmail: 'buyer@example.com',
        dedupeKey: 'payment-failure:evt_expired_1',
      }),
    );
  });
});

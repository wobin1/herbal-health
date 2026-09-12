import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  order: { findUnique: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const releaseSoldCapacityMock = vi.fn();
vi.mock('@/server/services/inventory-service', () => ({ releaseSoldCapacity: releaseSoldCapacityMock }));

const enqueueEmailMock = vi.fn();
vi.mock('@/server/services/email-queue-service', () => ({ enqueueEmail: enqueueEmailMock }));

const refundPaymentMock = vi.fn();
vi.mock('@/lib/payments/provider', () => ({ getPaymentProvider: () => ({ refundPayment: refundPaymentMock }) }));

const {
  refundOrder,
  OrderNotFoundError,
  OrderNotRefundableError,
  PaymentNotFoundError,
} = await import('@/server/services/refund-service');

const ATTENDEE = { id: 'att-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' };

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    eventId: 'evt-1',
    status: 'PAID',
    items: [{ id: 'item-1', eventTicketTypeId: 'tt-1', quantity: 2 }],
    payments: [
      {
        id: 'pay-1',
        status: 'SUCCEEDED',
        providerPaymentId: 'pi_1',
        amountMinorUnits: 5000,
        currency: 'USD',
      },
    ],
    registrations: [{ id: 'reg-1', reference: 'HHS-2026-ABCDEF', attendee: ATTENDEE }],
    event: { title: 'Herbal Basics', startAt: new Date('2026-06-01T00:00:00Z'), city: 'Austin', state: 'TX' },
    ...overrides,
  };
}

function makeTx() {
  return {
    payment: { update: vi.fn().mockResolvedValue({}) },
    order: { update: vi.fn().mockResolvedValue({}) },
    registration: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('refundOrder', () => {
  it('throws OrderNotFoundError when the order does not exist', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(refundOrder('missing', { actorId: 'admin-1' })).rejects.toThrow(OrderNotFoundError);
    expect(refundPaymentMock).not.toHaveBeenCalled();
  });

  it('throws OrderNotRefundableError when the order is not PAID', async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder({ status: 'PENDING' }));
    await expect(refundOrder('order-1', { actorId: 'admin-1' })).rejects.toThrow(OrderNotRefundableError);
    expect(refundPaymentMock).not.toHaveBeenCalled();
  });

  it('throws PaymentNotFoundError when there is no succeeded payment', async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder({ payments: [] }));
    await expect(refundOrder('order-1', { actorId: 'admin-1' })).rejects.toThrow(PaymentNotFoundError);
  });

  it('never trusts a client-supplied refund amount — refunds exactly the stored Payment.amountMinorUnits', async () => {
    const order = baseOrder();
    prismaMock.order.findUnique.mockResolvedValue(order);
    refundPaymentMock.mockResolvedValue({ id: 're_1' });
    const tx = makeTx();
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await refundOrder('order-1', { actorId: 'admin-1', ipAddress: '10.0.0.1' });

    expect(refundPaymentMock).toHaveBeenCalledWith({ providerPaymentId: 'pi_1', amountMinorUnits: 5000 });
  });

  it('marks payment/order refunded, cancels registrations, and releases sold inventory', async () => {
    const order = baseOrder();
    prismaMock.order.findUnique.mockResolvedValue(order);
    refundPaymentMock.mockResolvedValue({ id: 're_1' });
    const tx = makeTx();
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await refundOrder('order-1', { actorId: 'admin-1', ipAddress: '10.0.0.1' });

    expect(tx.payment.update).toHaveBeenCalledWith({ where: { id: 'pay-1' }, data: { status: 'REFUNDED' } });
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: 'REFUNDED' } });
    expect(tx.registration.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { status: 'CANCELLED' },
    });
    expect(releaseSoldCapacityMock).toHaveBeenCalledWith(tx, 'tt-1', 2);
  });

  it('records an audit log entry for the refund', async () => {
    const order = baseOrder();
    prismaMock.order.findUnique.mockResolvedValue(order);
    refundPaymentMock.mockResolvedValue({ id: 're_1' });
    const tx = makeTx();
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await refundOrder('order-1', { actorId: 'admin-1', ipAddress: '10.0.0.1' });

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'order.refunded',
        entityType: 'Order',
        entityId: 'order-1',
        ipAddress: '10.0.0.1',
      }),
    );
  });

  it('sends a refund confirmation email to each registered attendee', async () => {
    const order = baseOrder();
    prismaMock.order.findUnique.mockResolvedValue(order);
    refundPaymentMock.mockResolvedValue({ id: 're_1' });
    const tx = makeTx();
    prismaMock.$transaction.mockImplementation(async (fn) => fn(tx));

    await refundOrder('order-1', { actorId: 'admin-1' });

    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        type: 'REFUND_CONFIRMATION',
        toEmail: 'jane@example.com',
        variables: expect.objectContaining({ registrationReference: 'HHS-2026-ABCDEF' }),
      }),
    );
  });
});

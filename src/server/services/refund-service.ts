import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { releaseSoldCapacity } from '@/server/services/inventory-service';
import { getPaymentProvider } from '@/lib/payments/stripe';
import { sendRefundConfirmationEmail } from '@/lib/email/registration-confirmation';

export class OrderNotFoundError extends Error {}
export class OrderNotRefundableError extends Error {}
export class PaymentNotFoundError extends Error {}

export interface RefundActor {
  actorId: string;
  ipAddress?: string | null;
}

/**
 * Admin-initiated full refund. The refund amount is never client-supplied —
 * it is always the amount recorded on the order's succeeded Payment row.
 * The provider call happens outside the DB transaction (a real refund can't
 * be rolled back), then order/registration/inventory state is updated
 * atomically once the provider confirms.
 */
export async function refundOrder(orderId: string, actor: RefundActor) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
      registrations: { include: { attendee: true } },
    },
  });
  if (!order) {
    throw new OrderNotFoundError(`Order ${orderId} not found`);
  }
  if (order.status !== 'PAID') {
    throw new OrderNotRefundableError(`Order ${orderId} is not in a refundable state`);
  }
  const payment = order.payments.find((p) => p.status === 'SUCCEEDED');
  if (!payment || !payment.providerPaymentId) {
    throw new PaymentNotFoundError(`Order ${orderId} has no succeeded payment to refund`);
  }

  const provider = getPaymentProvider();
  const refund = await provider.refundPayment({
    providerPaymentId: payment.providerPaymentId,
    amountMinorUnits: payment.amountMinorUnits,
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
    await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
    await tx.registration.updateMany({ where: { orderId: order.id }, data: { status: 'CANCELLED' } });

    for (const item of order.items) {
      await releaseSoldCapacity(tx, item.eventTicketTypeId, item.quantity);
    }

    await recordAuditLog({
      actorId: actor.actorId,
      action: 'order.refunded',
      entityType: 'Order',
      entityId: order.id,
      ipAddress: actor.ipAddress,
      metadata: { paymentId: payment.id, providerRefundId: refund.id, amountMinorUnits: payment.amountMinorUnits },
    });
  });

  for (const registration of order.registrations) {
    await sendRefundConfirmationEmail({
      toEmail: registration.attendee.email,
      attendeeName: `${registration.attendee.firstName} ${registration.attendee.lastName}`,
      eventTitle: order.eventId,
      reference: registration.reference,
      amountMinorUnits: payment.amountMinorUnits,
      currency: payment.currency,
    });
  }

  return order;
}

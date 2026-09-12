import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { convertReservationToSale } from '@/server/services/inventory-service';
import { createRegistrationWithUniqueReference } from '@/server/services/registration-service';
import { sendRegistrationConfirmationEmail } from '@/lib/email/registration-confirmation';
import type { PaymentWebhookEvent } from '@/lib/payments/types';

export class OrderNotFoundError extends Error {}

export interface ProcessWebhookResult {
  /** True when this Stripe event id was already processed (duplicate delivery). */
  duplicate: boolean;
}

/**
 * Processes a verified `checkout.session.completed` event idempotently.
 *
 * Idempotency is enforced by the database, not a separate read-then-write
 * check: `Payment.providerEventId` has a unique constraint, and the Payment
 * row is created inside the same transaction that pays the order and mints
 * registrations. If Stripe redelivers the same event, the Payment insert
 * hits the unique constraint, the transaction rolls back, and we report a
 * duplicate — no double payment row, no double registration, order/
 * inventory state unchanged.
 */
export async function processCheckoutCompleted(
  event: Extract<PaymentWebhookEvent, { type: 'checkout.session.completed' }>,
): Promise<ProcessWebhookResult> {
  try {
    await prisma.$transaction(async (tx) => {
      // Unique constraint on providerEventId makes this the idempotency gate.
      await tx.payment.create({
        data: {
          orderId: event.orderId,
          provider: 'stripe',
          providerPaymentId: event.paymentIntentId,
          providerEventId: event.providerEventId,
          status: 'SUCCEEDED',
          amountMinorUnits: event.amountMinorUnits,
          currency: event.currency,
          rawPayload: event.raw as never,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: event.orderId },
        include: { items: { include: { attendees: true } } },
      });
      if (!order) {
        throw new OrderNotFoundError(`Order ${event.orderId} not found`);
      }

      // Order already paid (e.g. reconciled by another path) — do not
      // re-mint registrations or double-convert inventory.
      if (order.status === 'PAID') {
        return;
      }

      await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });

      for (const item of order.items) {
        await convertReservationToSale(tx, item.eventTicketTypeId, item.quantity);
        for (const attendee of item.attendees) {
          const registration = await createRegistrationWithUniqueReference(tx, {
            orderId: order.id,
            orderItemId: item.id,
            attendeeId: attendee.id,
            eventId: order.eventId,
          });
          await sendRegistrationConfirmationEmail({
            toEmail: attendee.email,
            attendeeName: `${attendee.firstName} ${attendee.lastName}`,
            eventTitle: order.eventId,
            reference: registration.reference,
          });
        }
      }

      await recordAuditLog({
        action: 'order.paid',
        entityType: 'Order',
        entityId: order.id,
        metadata: { providerEventId: event.providerEventId },
      });
    });
    return { duplicate: false };
  } catch (error) {
    const code = (error as { code?: string; meta?: { target?: string[] } } | null)?.code;
    const target = (error as { meta?: { target?: string[] } } | null)?.meta?.target;
    if (code === 'P2002' && (!target || target.includes('providerEventId'))) {
      return { duplicate: true };
    }
    throw error;
  }
}

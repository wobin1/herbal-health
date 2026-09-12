import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { convertReservationToSale } from '@/server/services/inventory-service';
import { createRegistrationWithUniqueReference } from '@/server/services/registration-service';
import { enqueueEmail } from '@/server/services/email-queue-service';
import type { PaymentWebhookEvent } from '@/lib/payments/types';

function formatMoney(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountMinorUnits / 100);
}

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
        include: { items: { include: { attendees: true } }, event: true },
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

      const eventVariables = {
        eventTitle: order.event.title,
        eventStartAt: order.event.startAt.toISOString(),
        eventLocation: `${order.event.city}, ${order.event.state}`,
      };

      for (const item of order.items) {
        await convertReservationToSale(tx, item.eventTicketTypeId, item.quantity);
        for (const attendee of item.attendees) {
          const registration = await createRegistrationWithUniqueReference(tx, {
            orderId: order.id,
            orderItemId: item.id,
            attendeeId: attendee.id,
            eventId: order.eventId,
          });
          await enqueueEmail(tx, {
            type: 'REGISTRATION_CONFIRMATION',
            toEmail: attendee.email,
            dedupeKey: `registration-confirmation:${registration.id}`,
            variables: {
              attendeeFirstName: attendee.firstName,
              registrationReference: registration.reference,
              ...eventVariables,
            },
          });
          if (process.env.ADMIN_NOTIFICATION_EMAIL) {
            await enqueueEmail(tx, {
              type: 'ADMIN_NEW_REGISTRATION',
              toEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
              dedupeKey: `admin-new-registration:${registration.id}`,
              variables: {
                attendeeFirstName: attendee.firstName,
                registrationReference: registration.reference,
                ...eventVariables,
              },
            });
          }
        }
      }

      await enqueueEmail(tx, {
        type: 'PAYMENT_RECEIPT',
        toEmail: order.buyerEmail,
        dedupeKey: `payment-receipt:${order.id}`,
        variables: {
          attendeeFirstName: order.buyerName,
          orderTotal: formatMoney(order.totalMinorUnits, order.currency),
          ...eventVariables,
        },
      });

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

/**
 * A checkout session that expired unpaid (buyer abandoned, card declined and
 * never retried, etc). The order itself already transitions to EXPIRED via
 * the separate reservation-cleanup job; this only notifies the buyer that
 * their payment did not go through.
 */
export async function processCheckoutExpired(
  event: Extract<PaymentWebhookEvent, { type: 'checkout.session.expired' }>,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: event.orderId },
    include: { event: true },
  });
  if (!order) {
    throw new OrderNotFoundError(`Order ${event.orderId} not found`);
  }

  await enqueueEmail(prisma, {
    type: 'PAYMENT_FAILURE',
    toEmail: order.buyerEmail,
    dedupeKey: `payment-failure:${event.providerEventId}`,
    variables: {
      attendeeFirstName: order.buyerName,
      eventTitle: order.event.title,
      eventStartAt: order.event.startAt.toISOString(),
      eventLocation: `${order.event.city}, ${order.event.state}`,
    },
  });
}

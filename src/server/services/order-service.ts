import type { Order, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { reserveTicketCapacity, withSerializableTransaction } from '@/server/services/inventory-service';
import type { CheckoutRequestInput } from '@/lib/validation/checkout';
import { buildPageResult, toSkipTake, type PageParams } from '@/lib/pagination';

export class TicketTypeNotFoundError extends Error {}
export class EventNotOnSaleError extends Error {}
export class OrderNotFoundError extends Error {}

/** Reservations expire after this window if payment isn't completed. */
export const RESERVATION_WINDOW_MINUTES = 15;

export interface CreatePendingOrderActor {
  ipAddress?: string | null;
}

/**
 * Creates a PENDING order with an atomic inventory reservation. Price is
 * ALWAYS computed here from the server-side EventTicketType record — the
 * request body's quantity/ticketTypeId select *which* ticket, never its
 * price or the order total.
 */
export async function createPendingOrder(
  input: CheckoutRequestInput,
  actor: CreatePendingOrderActor,
): Promise<Order> {
  return withSerializableTransaction(prisma, async (tx) => {
    const ticketType = await tx.eventTicketType.findUnique({
      where: { id: input.ticketTypeId },
      include: { event: true },
    });
    if (!ticketType || ticketType.eventId !== input.eventId) {
      throw new TicketTypeNotFoundError('Ticket type not found for this event');
    }
    if (!['PUBLISHED', 'ON_SALE'].includes(ticketType.event.status)) {
      throw new EventNotOnSaleError('Event is not currently on sale');
    }

    await reserveTicketCapacity(tx, ticketType.id, input.quantity);

    // Server-computed total — never trust a client-supplied price/total.
    const unitPrice = ticketType.priceMinorUnits;
    const subtotal = unitPrice * input.quantity;
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_WINDOW_MINUTES * 60_000);

    const order = await tx.order.create({
      data: {
        eventId: input.eventId,
        status: 'PENDING',
        totalMinorUnits: subtotal,
        currency: ticketType.currency,
        buyerEmail: input.buyerEmail,
        buyerName: input.buyerName,
        reservationExpiresAt,
        items: {
          create: {
            eventTicketTypeId: ticketType.id,
            quantity: input.quantity,
            unitPriceMinorUnits: unitPrice,
            subtotalMinorUnits: subtotal,
          },
        },
        termAcceptances: {
          create: {
            termsVersion: input.termsVersion,
            ipAddress: actor.ipAddress ?? null,
          },
        },
      },
      include: { items: true },
    });

    const orderItem = order.items[0];
    await tx.attendee.createMany({
      data: input.attendees.map((attendee) => ({
        orderId: order.id,
        orderItemId: orderItem.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        phone: attendee.phone,
        country: attendee.country,
        organization: attendee.organization ?? null,
        accessibilityNotes: attendee.accessibilityNotes ?? null,
      })),
    });

    await recordAuditLog({
      action: 'order.created',
      entityType: 'Order',
      entityId: order.id,
      ipAddress: actor.ipAddress,
      metadata: { eventId: input.eventId, ticketTypeId: input.ticketTypeId, quantity: input.quantity },
    });

    return order;
  });
}

export async function attachCheckoutSession(orderId: string, checkoutSessionId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { stripeCheckoutSessionId: checkoutSessionId },
  });
}

export interface OrderListFilters {
  status?: OrderStatus;
  buyerEmail?: string;
  eventId?: string;
}

export async function listOrders(filters: OrderListFilters, pageParams: PageParams) {
  const where: Prisma.OrderWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.buyerEmail) where.buyerEmail = { equals: filters.buyerEmail, mode: 'insensitive' };
  if (filters.eventId) where.eventId = filters.eventId;

  const { skip, take } = toSkipTake(pageParams);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { event: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);
  return buildPageResult(orders, total, pageParams);
}

export async function getOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      items: { include: { eventTicketType: true, attendees: true } },
      payments: true,
      registrations: { include: { attendee: true } },
    },
  });
  if (!order) {
    throw new OrderNotFoundError(`Order ${orderId} not found`);
  }
  return order;
}

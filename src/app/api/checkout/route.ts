import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { getClientKey, rateLimit } from '@/lib/http/rate-limit';
import { checkoutRequestSchema } from '@/lib/validation/checkout';
import {
  createPendingOrder,
  attachCheckoutSession,
  TicketTypeNotFoundError,
  EventNotOnSaleError,
} from '@/server/services/order-service';
import { InsufficientInventoryError } from '@/server/services/inventory-service';
import { getPaymentProvider } from '@/lib/payments/provider';

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const key = `checkout:${getClientKey(request)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many checkout attempts, try again shortly');
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Invalid checkout payload');
  }

  const ipAddress = request.headers.get('x-forwarded-for');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  try {
    const order = await createPendingOrder(parsed.data, { ipAddress });

    const session = await getPaymentProvider().createCheckoutSession({
      orderId: order.id,
      amountMinorUnits: order.totalMinorUnits,
      currency: order.currency,
      buyerEmail: order.buyerEmail,
      description: 'Herbal Health Seminar ticket',
      // Stripe substitutes the literal {CHECKOUT_SESSION_ID} placeholder on redirect.
      successUrl: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/checkout/cancelled?orderId=${order.id}`,
    });

    await attachCheckoutSession(order.id, session.id);

    return NextResponse.json({ checkoutUrl: session.url, orderId: order.id }, { status: 201 });
  } catch (error) {
    if (error instanceof TicketTypeNotFoundError) {
      return errorResponse(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found');
    }
    if (error instanceof EventNotOnSaleError) {
      return errorResponse(409, 'EVENT_NOT_ON_SALE', 'This event is not currently on sale');
    }
    if (error instanceof InsufficientInventoryError) {
      return errorResponse(409, 'SOLD_OUT', 'Not enough tickets available');
    }
    console.error('[checkout] failed to start checkout', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to start checkout');
  }
}

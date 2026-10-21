import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { errorResponse } from '@/lib/http/errors';
import { getClientKey, rateLimit } from '@/lib/http/rate-limit';
import { mockCheckoutPaySchema } from '@/lib/validation/checkout';
import { MockPaymentProvider, MOCK_SIGNATURE_HEADER } from '@/lib/payments/mock';

const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/**
 * Stands in for a buyer completing payment on Stripe's hosted Checkout page.
 * Only active when `PAYMENT_PROVIDER=mock`. Delivers a signed, Stripe-shaped
 * webhook call to the real webhook route so order/inventory/registration
 * state transitions exactly as it will once live Stripe is wired up — this
 * route never touches Order/Payment state itself.
 */
export async function POST(request: NextRequest) {
  if (process.env.PAYMENT_PROVIDER !== 'mock') {
    return errorResponse(404, 'NOT_FOUND', 'Not found');
  }

  const key = `checkout-mock-pay:${getClientKey(request)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many attempts, try again shortly');
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

  const parsed = mockCheckoutPaySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Invalid mock checkout payload');
  }

  const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: parsed.data.sessionId } });
  if (!order) {
    return errorResponse(404, 'ORDER_NOT_FOUND', 'Order not found for this session');
  }
  if (order.status !== 'PENDING') {
    return errorResponse(409, 'ORDER_NOT_PENDING', 'This order is no longer awaiting payment');
  }

  const provider = new MockPaymentProvider();
  const payload = JSON.stringify({
    type: 'checkout.session.completed',
    eventId: `mock_evt_${randomUUID()}`,
    checkoutSessionId: parsed.data.sessionId,
    orderId: order.id,
    paymentIntentId: `mock_pi_${randomUUID()}`,
    amountMinorUnits: order.totalMinorUnits,
    currency: order.currency,
  });

  const webhookResponse = await fetch(`${request.nextUrl.origin}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [MOCK_SIGNATURE_HEADER]: provider.signWebhookPayload(payload) },
    body: payload,
  });
  if (!webhookResponse.ok) {
    return errorResponse(502, 'WEBHOOK_FAILED', 'Simulated payment could not be processed');
  }

  return NextResponse.json({ redirectUrl: `/checkout/success?session_id=${encodeURIComponent(parsed.data.sessionId)}` });
}

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { getPaymentProvider } from '@/lib/payments/provider';
import { MOCK_SIGNATURE_HEADER } from '@/lib/payments/mock';
import { InvalidWebhookSignatureError } from '@/lib/payments/types';
import { processCheckoutCompleted, processCheckoutExpired } from '@/server/services/payment-webhook-service';

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Stripe webhook receiver. The Checkout success-URL redirect NEVER marks an
 * order paid — only this handler does, after verifying the Stripe signature
 * on the raw body.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Webhook body too large');
  }

  const signature = request.headers.get('stripe-signature') ?? request.headers.get(MOCK_SIGNATURE_HEADER);

  let event;
  try {
    event = getPaymentProvider().parseWebhookEvent(rawBody, signature);
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return errorResponse(400, 'INVALID_SIGNATURE', 'Webhook signature verification failed');
    }
    return errorResponse(400, 'INVALID_WEBHOOK', 'Unable to parse webhook payload');
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const result = await processCheckoutCompleted(event);
      return NextResponse.json({ received: true, duplicate: result.duplicate });
    }
    if (event.type === 'checkout.session.expired') {
      await processCheckoutExpired(event);
    }
    return NextResponse.json({ received: true });
  } catch {
    return errorResponse(500, 'WEBHOOK_PROCESSING_FAILED', 'Unable to process webhook');
  }
}

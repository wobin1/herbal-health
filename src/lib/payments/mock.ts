import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type {
  CheckoutSession,
  CreateCheckoutSessionInput,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundResult,
} from '@/lib/payments/types';
import { InvalidWebhookSignatureError } from '@/lib/payments/types';

/** Header the mock "Pay" endpoint signs and the webhook route accepts, alongside `stripe-signature`. */
export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

interface MockWebhookPayload {
  type: string;
  eventId: string;
  orderId: string;
  checkoutSessionId?: string;
  paymentIntentId?: string | null;
  amountMinorUnits?: number;
  currency?: string;
}

/**
 * Stand-in for `StripePaymentProvider` (same `PaymentProvider` port) so
 * checkout/payment flows can be exercised end-to-end before real Stripe
 * keys exist. "Checkout" redirects to an internal fake payment page
 * (`/checkout/mock/[sessionId]`) instead of Stripe's hosted page; that page
 * simulates a webhook delivery, signed the same way Stripe signs
 * `stripe-signature` so signature verification is still exercised for real.
 */
export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly webhookSecret: string = process.env.PAYMENT_WEBHOOK_SECRET ?? '') {}

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
    const id = `mock_cs_${randomUUID()}`;
    const origin = new URL(input.successUrl).origin;
    return { id, url: `${origin}/checkout/mock/${id}` };
  }

  signWebhookPayload(rawBody: string): string {
    return createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
  }

  parseWebhookEvent(rawBody: string, signatureHeader: string | null): PaymentWebhookEvent {
    if (!signatureHeader) {
      throw new InvalidWebhookSignatureError('Missing mock signature header');
    }

    const expected = Buffer.from(this.signWebhookPayload(rawBody));
    const actual = Buffer.from(signatureHeader);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new InvalidWebhookSignatureError('Mock signature verification failed');
    }

    let payload: MockWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as MockWebhookPayload;
    } catch {
      throw new InvalidWebhookSignatureError('Mock webhook payload is not valid JSON');
    }

    if (payload.type === 'checkout.session.completed') {
      return {
        type: 'checkout.session.completed',
        providerEventId: payload.eventId,
        checkoutSessionId: payload.checkoutSessionId ?? '',
        orderId: payload.orderId,
        paymentIntentId: payload.paymentIntentId ?? null,
        amountMinorUnits: payload.amountMinorUnits ?? 0,
        currency: payload.currency ?? 'USD',
        raw: payload,
      };
    }

    if (payload.type === 'checkout.session.expired') {
      return {
        type: 'checkout.session.expired',
        providerEventId: payload.eventId,
        orderId: payload.orderId,
        raw: payload,
      };
    }

    return { type: 'unhandled', providerEventId: payload.eventId, raw: payload };
  }

  async refundPayment(): Promise<RefundResult> {
    return { id: `mock_re_${randomUUID()}` };
  }
}

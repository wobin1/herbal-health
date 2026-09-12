import Stripe from 'stripe';
import type {
  CheckoutSession,
  CreateCheckoutSessionInput,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundPaymentInput,
  RefundResult,
} from '@/lib/payments/types';
import { InvalidWebhookSignatureError } from '@/lib/payments/types';

function getStripeClient(): Stripe {
  const secretKey = process.env.PAYMENT_SECRET_KEY;
  if (!secretKey) {
    throw new Error('PAYMENT_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey);
}

export class StripePaymentProvider implements PaymentProvider {
  private readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(client: Stripe = getStripeClient(), webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? '') {
    this.client = client;
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.buyerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinorUnits,
            product_data: { name: input.description },
          },
        },
      ],
      metadata: { orderId: input.orderId },
    });
    if (!session.url) {
      throw new Error('Stripe did not return a checkout session URL');
    }
    return { id: session.id, url: session.url };
  }

  parseWebhookEvent(rawBody: string, signatureHeader: string | null): PaymentWebhookEvent {
    if (!signatureHeader) {
      throw new InvalidWebhookSignatureError('Missing Stripe-Signature header');
    }
    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    } catch {
      throw new InvalidWebhookSignatureError('Stripe signature verification failed');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        return { type: 'unhandled', providerEventId: event.id, raw: event };
      }
      return {
        type: 'checkout.session.completed',
        providerEventId: event.id,
        checkoutSessionId: session.id,
        orderId,
        paymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
        amountMinorUnits: session.amount_total ?? 0,
        currency: (session.currency ?? 'usd').toUpperCase(),
        raw: event,
      };
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        return { type: 'unhandled', providerEventId: event.id, raw: event };
      }
      return { type: 'checkout.session.expired', providerEventId: event.id, orderId, raw: event };
    }

    return { type: 'unhandled', providerEventId: event.id, raw: event };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundResult> {
    const refund = await this.client.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: input.amountMinorUnits,
    });
    return { id: refund.id };
  }
}

let cachedProvider: PaymentProvider | null = null;

/** Lazily constructed singleton — avoids requiring env vars at import time (e.g. in tests). */
export function getPaymentProvider(): PaymentProvider {
  if (!cachedProvider) {
    cachedProvider = new StripePaymentProvider();
  }
  return cachedProvider;
}

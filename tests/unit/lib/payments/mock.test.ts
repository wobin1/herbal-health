import { describe, expect, it } from 'vitest';
import { MockPaymentProvider } from '@/lib/payments/mock';
import { InvalidWebhookSignatureError, type PaymentProvider } from '@/lib/payments/types';

const SECRET = 'whsec_mock_test';

function payloadFor(overrides: Record<string, unknown>): string {
  return JSON.stringify({ eventId: 'evt_mock_1', orderId: 'order-1', ...overrides });
}

describe('MockPaymentProvider.createCheckoutSession', () => {
  it('returns a URL to the internal mock checkout page under the success URL origin', async () => {
    const provider = new MockPaymentProvider(SECRET);

    const session = await provider.createCheckoutSession({
      orderId: 'order-1',
      amountMinorUnits: 5000,
      currency: 'USD',
      buyerEmail: 'jane@example.com',
      description: 'Ticket',
      successUrl: 'https://staging.example.com/checkout/success?orderId=order-1',
      cancelUrl: 'https://staging.example.com/checkout/cancelled?orderId=order-1',
    });

    expect(session.id).toMatch(/^mock_cs_/);
    expect(session.url).toBe(`https://staging.example.com/checkout/mock/${session.id}`);
  });
});

describe('MockPaymentProvider.parseWebhookEvent', () => {
  it('rejects a request with no signature header', () => {
    const provider = new MockPaymentProvider(SECRET);
    expect(() => provider.parseWebhookEvent('{}', null)).toThrow(InvalidWebhookSignatureError);
  });

  it('rejects a request whose signature does not match the payload', () => {
    const provider = new MockPaymentProvider(SECRET);
    expect(() => provider.parseWebhookEvent('{}', 'not-the-real-signature')).toThrow(
      InvalidWebhookSignatureError,
    );
  });

  it('normalizes a signed checkout.session.completed payload', () => {
    const provider = new MockPaymentProvider(SECRET);
    const body = payloadFor({
      type: 'checkout.session.completed',
      checkoutSessionId: 'mock_cs_1',
      paymentIntentId: 'mock_pi_1',
      amountMinorUnits: 5000,
      currency: 'USD',
    });
    const signature = provider.signWebhookPayload(body);

    const event = provider.parseWebhookEvent(body, signature);

    expect(event).toEqual(
      expect.objectContaining({
        type: 'checkout.session.completed',
        providerEventId: 'evt_mock_1',
        checkoutSessionId: 'mock_cs_1',
        orderId: 'order-1',
        paymentIntentId: 'mock_pi_1',
        amountMinorUnits: 5000,
        currency: 'USD',
      }),
    );
  });

  it('normalizes a signed checkout.session.expired payload', () => {
    const provider = new MockPaymentProvider(SECRET);
    const body = payloadFor({ type: 'checkout.session.expired' });
    const signature = provider.signWebhookPayload(body);

    const event = provider.parseWebhookEvent(body, signature);

    expect(event).toEqual(
      expect.objectContaining({
        type: 'checkout.session.expired',
        providerEventId: 'evt_mock_1',
        orderId: 'order-1',
      }),
    );
  });

  it('returns an unhandled event for unrecognized types', () => {
    const provider = new MockPaymentProvider(SECRET);
    const body = payloadFor({ type: 'something.else' });
    const signature = provider.signWebhookPayload(body);

    const event = provider.parseWebhookEvent(body, signature);

    expect(event.type).toBe('unhandled');
  });
});

describe('MockPaymentProvider.refundPayment', () => {
  it('returns a mock refund id', async () => {
    const provider: PaymentProvider = new MockPaymentProvider(SECRET);
    const result = await provider.refundPayment({ providerPaymentId: 'mock_pi_1', amountMinorUnits: 5000 });
    expect(result.id).toMatch(/^mock_re_/);
  });
});

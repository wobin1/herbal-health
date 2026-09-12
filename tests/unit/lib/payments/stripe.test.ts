import { describe, expect, it, vi } from 'vitest';
import { StripePaymentProvider } from '@/lib/payments/stripe';
import { InvalidWebhookSignatureError } from '@/lib/payments/types';

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    checkout: { sessions: { create: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
    refunds: { create: vi.fn() },
    ...overrides,
  };
}

describe('StripePaymentProvider.createCheckoutSession', () => {
  it('creates a Stripe Checkout session using the server-computed amount', async () => {
    const client = makeClient();
    (client.checkout.sessions.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/cs_test_1',
    });
    const provider = new StripePaymentProvider(client as never, 'whsec_test');

    const result = await provider.createCheckoutSession({
      orderId: 'order-1',
      amountMinorUnits: 5000,
      currency: 'USD',
      buyerEmail: 'jane@example.com',
      description: 'Ticket',
      successUrl: 'https://site/success',
      cancelUrl: 'https://site/cancel',
    });

    expect(result).toEqual({ id: 'cs_test_1', url: 'https://checkout.stripe.com/cs_test_1' });
    const call = (client.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.line_items[0].price_data.unit_amount).toBe(5000);
    expect(call.metadata.orderId).toBe('order-1');
  });
});

describe('StripePaymentProvider.parseWebhookEvent', () => {
  it('rejects a request with no signature header', () => {
    const client = makeClient();
    const provider = new StripePaymentProvider(client as never, 'whsec_test');
    expect(() => provider.parseWebhookEvent('{}', null)).toThrow(InvalidWebhookSignatureError);
    expect(client.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it('rejects a request whose signature does not verify', () => {
    const client = makeClient();
    (client.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('signature mismatch');
    });
    const provider = new StripePaymentProvider(client as never, 'whsec_test');
    expect(() => provider.parseWebhookEvent('{}', 'bad-signature')).toThrow(InvalidWebhookSignatureError);
  });

  it('normalizes a verified checkout.session.completed event', () => {
    const client = makeClient();
    (client.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          metadata: { orderId: 'order-1' },
          payment_intent: 'pi_1',
          amount_total: 5000,
          currency: 'usd',
        },
      },
    });
    const provider = new StripePaymentProvider(client as never, 'whsec_test');
    const event = provider.parseWebhookEvent('{}', 'valid-signature');
    expect(event).toEqual(
      expect.objectContaining({
        type: 'checkout.session.completed',
        providerEventId: 'evt_1',
        orderId: 'order-1',
        paymentIntentId: 'pi_1',
        amountMinorUnits: 5000,
        currency: 'USD',
      }),
    );
  });

  it('returns an unhandled event for types the app does not process', () => {
    const client = makeClient();
    (client.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 'evt_2',
      type: 'payment_intent.created',
      data: { object: {} },
    });
    const provider = new StripePaymentProvider(client as never, 'whsec_test');
    const event = provider.parseWebhookEvent('{}', 'valid-signature');
    expect(event.type).toBe('unhandled');
  });
});

describe('StripePaymentProvider.refundPayment', () => {
  it('refunds the exact server-computed amount against the payment intent', async () => {
    const client = makeClient();
    (client.refunds.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 're_1' });
    const provider = new StripePaymentProvider(client as never, 'whsec_test');

    const result = await provider.refundPayment({ providerPaymentId: 'pi_1', amountMinorUnits: 5000 });

    expect(result).toEqual({ id: 're_1' });
    expect(client.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1', amount: 5000 });
  });
});

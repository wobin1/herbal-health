import type { PaymentProvider } from '@/lib/payments/types';
import { StripePaymentProvider } from '@/lib/payments/stripe';
import { MockPaymentProvider } from '@/lib/payments/mock';

let cachedProvider: PaymentProvider | null = null;

/**
 * Lazily constructed singleton — avoids requiring provider env vars at
 * import time (e.g. in tests). Set `PAYMENT_PROVIDER=mock` to stand in for
 * Stripe until the real integration is wired up; every other value uses
 * live Stripe.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!cachedProvider) {
    cachedProvider =
      process.env.PAYMENT_PROVIDER === 'mock' ? new MockPaymentProvider() : new StripePaymentProvider();
  }
  return cachedProvider;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getPaymentProvider', () => {
  it('returns a MockPaymentProvider when PAYMENT_PROVIDER=mock', async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    const { getPaymentProvider } = await import('@/lib/payments/provider');
    const { MockPaymentProvider } = await import('@/lib/payments/mock');

    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
  });

  it('returns a StripePaymentProvider when PAYMENT_PROVIDER is unset', async () => {
    delete process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_SECRET_KEY = 'sk_test_123';
    const { getPaymentProvider } = await import('@/lib/payments/provider');
    const { StripePaymentProvider } = await import('@/lib/payments/stripe');

    expect(getPaymentProvider()).toBeInstanceOf(StripePaymentProvider);
  });

  it('caches the provider instance across calls', async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    const { getPaymentProvider } = await import('@/lib/payments/provider');

    expect(getPaymentProvider()).toBe(getPaymentProvider());
  });
});

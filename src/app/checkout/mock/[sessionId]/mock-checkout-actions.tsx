'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MockCheckoutActionsProps {
  sessionId: string;
  orderId: string;
}

/**
 * Mirrors what a buyer can do on Stripe's hosted page: pay, or abandon it.
 * Cancelling here matches real Stripe behavior — it's a plain redirect, no
 * webhook fires; the order stays PENDING until the existing
 * reservation-expiry job releases it.
 */
export function MockCheckoutActions({ sessionId, orderId }: MockCheckoutActionsProps) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch('/api/checkout/mock/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.redirectUrl !== 'string') {
        throw new Error(data?.error?.message ?? 'Payment could not be processed');
      }
      router.push(data.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be processed');
      setPaying(false);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast ease-premium hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30 disabled:opacity-60"
      >
        {paying ? 'Processing…' : 'Pay (simulate success)'}
      </button>
      <button
        type="button"
        onClick={() => router.push(`/checkout/cancelled?orderId=${orderId}`)}
        disabled={paying}
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30 disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  );
}

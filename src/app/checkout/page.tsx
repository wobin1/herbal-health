'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ButtonSpinner } from '@/components/icons';

const TERMS_VERSION = '2026-01-01';
const MAX_QUANTITY = 10;

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';
  const ticketTypeId = searchParams.get('ticketTypeId') ?? '';

  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!eventId || !ticketTypeId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <p role="alert">Missing ticket selection. Please go back and choose a ticket.</p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError('You must accept the terms to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTypeId,
          quantity,
          buyerEmail,
          buyerName,
          buyerPhone,
          buyerCountry,
          termsVersion: TERMS_VERSION,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? 'Unable to start checkout. Please try again.');
        setSubmitting(false);
        return;
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch {
      setError('Unable to start checkout. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <main className="animate-fade-in-up mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold text-neutral-900">Checkout</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="text-lg font-medium text-neutral-900">Buyer Details</legend>

          <div>
            <label htmlFor="buyerName" className="block text-sm font-medium text-neutral-700">
              Full Name
            </label>
            <input
              id="buyerName"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 transition-colors duration-fast ease-premium focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
          </div>

          <div>
            <label htmlFor="buyerEmail" className="block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="buyerEmail"
              type="email"
              required
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 transition-colors duration-fast ease-premium focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
          </div>

          <div>
            <label htmlFor="buyerPhone" className="block text-sm font-medium text-neutral-700">
              Phone
            </label>
            <input
              id="buyerPhone"
              required
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 transition-colors duration-fast ease-premium focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
          </div>

          <div>
            <label htmlFor="buyerCountry" className="block text-sm font-medium text-neutral-700">
              Country
            </label>
            <input
              id="buyerCountry"
              required
              value={buyerCountry}
              onChange={(e) => setBuyerCountry(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 transition-colors duration-fast ease-premium focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-neutral-700">
              Number of Tickets
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={MAX_QUANTITY}
              required
              value={quantity}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) {
                  setQuantity(Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(next))));
                }
              }}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 transition-colors duration-fast ease-premium focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
            <p className="mt-1 text-sm text-neutral-500">All tickets are registered under your details above.</p>
          </div>
        </fieldset>

        <div className="flex items-start gap-2">
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-neutral-700">
            I have read and agree to the{' '}
            <Link href="/terms" className="underline transition-colors duration-fast ease-premium hover:text-primary-950">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/disclaimer" className="underline transition-colors duration-fast ease-premium hover:text-primary-950">
              Disclaimer
            </Link>
            .
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-6 py-3 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:opacity-50"
        >
          {submitting ? <ButtonSpinner /> : null}
          {submitting ? 'Starting checkout…' : 'Continue to Payment'}
        </button>
      </form>
    </main>
  );
}

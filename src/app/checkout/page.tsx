'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AttendeeFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  organization: string;
  accessibilityNotes: string;
}

const EMPTY_ATTENDEE: AttendeeFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  organization: '',
  accessibilityNotes: '',
};

const TERMS_VERSION = '2026-01-01';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';
  const ticketTypeId = searchParams.get('ticketTypeId') ?? '';

  const [attendee, setAttendee] = useState<AttendeeFormState>(EMPTY_ATTENDEE);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
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
          quantity: 1,
          attendees: [
            {
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              email: attendee.email,
              phone: attendee.phone,
              country: attendee.country,
              organization: attendee.organization || undefined,
              accessibilityNotes: attendee.accessibilityNotes || undefined,
            },
          ],
          buyerEmail,
          buyerName,
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
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold text-neutral-900">Checkout</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="text-lg font-medium text-neutral-900">Attendee Details</legend>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">
              First Name
            </label>
            <input
              id="firstName"
              required
              value={attendee.firstName}
              onChange={(e) => setAttendee({ ...attendee, firstName: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">
              Last Name
            </label>
            <input
              id="lastName"
              required
              value={attendee.lastName}
              onChange={(e) => setAttendee({ ...attendee, lastName: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="attendeeEmail" className="block text-sm font-medium text-neutral-700">
              Attendee Email
            </label>
            <input
              id="attendeeEmail"
              type="email"
              required
              value={attendee.email}
              onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
              Phone
            </label>
            <input
              id="phone"
              required
              value={attendee.phone}
              onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-neutral-700">
              Country
            </label>
            <input
              id="country"
              required
              value={attendee.country}
              onChange={(e) => setAttendee({ ...attendee, country: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-neutral-700">
              Organization (optional)
            </label>
            <input
              id="organization"
              value={attendee.organization}
              onChange={(e) => setAttendee({ ...attendee, organization: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="accessibilityNotes" className="block text-sm font-medium text-neutral-700">
              Accessibility Notes (optional)
            </label>
            <textarea
              id="accessibilityNotes"
              value={attendee.accessibilityNotes}
              onChange={(e) => setAttendee({ ...attendee, accessibilityNotes: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
        </fieldset>

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
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
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
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
            />
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
            <Link href="/terms" className="underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/disclaimer" className="underline">
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
          className="rounded-full bg-primary-950 px-6 py-3 text-sm font-medium text-neutral-50 disabled:opacity-50"
        >
          {submitting ? 'Starting checkout…' : 'Continue to Payment'}
        </button>
      </form>
    </main>
  );
}

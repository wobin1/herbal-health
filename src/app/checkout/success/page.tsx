import Link from 'next/link';
import { getOrderConfirmation } from '@/server/services/order-service';
import { formatEventStart } from '@/lib/events/format-start';
import { RefreshUntilConfirmed } from './refresh-until-confirmed';

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

const LOOKUP_LINK = (
  <Link
    href="/registrations/lookup"
    className="underline transition-colors duration-fast ease-premium hover:text-primary-950"
  >
    Look up your registration
  </Link>
);

/**
 * This page never marks an order as paid — it only reads what the Stripe
 * webhook handler (src/app/api/webhooks/stripe/route.ts) has already
 * recorded, and shows the tickets once they exist.
 */
export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const confirmation = sessionId ? await getOrderConfirmation(sessionId) : null;

  if (!confirmation) {
    return (
      <main className="animate-fade-in-up mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Thank you!</h1>
        <p className="mt-4 text-neutral-600">
          Your confirmation email has your ticket and registration reference.
        </p>
        <p className="mt-8">{LOOKUP_LINK}</p>
      </main>
    );
  }

  if (confirmation.status !== 'PAID' || confirmation.tickets.length === 0) {
    return (
      <main className="animate-fade-in-up mx-auto max-w-xl px-6 py-20 text-center">
        <RefreshUntilConfirmed />
        <h1 className="text-2xl font-semibold text-neutral-900">Thank you!</h1>
        <p role="status" className="mt-4 text-neutral-600">
          We&apos;re confirming your payment. Your tickets will appear here in a moment, and we&apos;ll
          email them to {confirmation.buyerEmail}.
        </p>
        <p className="mt-8">{LOOKUP_LINK}</p>
      </main>
    );
  }

  const { event, tickets } = confirmation;

  return (
    <main className="animate-fade-in-up mx-auto max-w-xl px-6 py-20">
      <h1 className="text-center text-2xl font-semibold text-neutral-900">
        {tickets.length === 1 ? 'Your ticket' : 'Your tickets'}
      </h1>
      <p className="mt-4 text-center text-neutral-600">
        Payment confirmed. We&apos;ve also emailed{' '}
        {tickets.length === 1 ? 'this ticket' : 'these tickets'} to {confirmation.buyerEmail}.
      </p>

      <ul className="mt-10 space-y-6">
        {tickets.map((ticket) => (
          <li key={ticket.reference} className="overflow-hidden rounded-2xl border border-neutral-300 bg-white">
            <div className="bg-primary-950 px-6 py-4 text-neutral-50">
              <p className="text-xs uppercase tracking-widest opacity-80">{ticket.ticketTypeName}</p>
              <h2 className="mt-1 text-lg font-semibold">{event.title}</h2>
            </div>
            <dl className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-neutral-600">Registration reference</dt>
                <dd className="mt-1 font-mono text-2xl font-bold tracking-wider text-neutral-900">
                  {ticket.reference}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-600">Attendee</dt>
                <dd className="mt-1 font-medium text-neutral-900">{ticket.attendeeName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-neutral-600">Location</dt>
                <dd className="mt-1 font-medium text-neutral-900">
                  {event.city}, {event.state}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-neutral-600">Date</dt>
                <dd className="mt-1 font-medium text-neutral-900">
                  {formatEventStart(event.startAt, event.timezone)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-sm text-neutral-600">
        Keep your registration reference handy. You may be asked for it at check-in.
      </p>
      <p className="mt-4 text-center">{LOOKUP_LINK}</p>
    </main>
  );
}

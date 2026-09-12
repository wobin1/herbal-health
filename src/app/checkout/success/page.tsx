import Link from 'next/link';

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

/**
 * This page never marks an order as paid — it's purely an informational
 * redirect target. Payment confirmation happens exclusively in the Stripe
 * webhook handler (src/app/api/webhooks/stripe/route.ts).
 */
export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { orderId } = await searchParams;

  return (
    <main className="animate-fade-in-up mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Thank you!</h1>
      <p className="mt-4 text-neutral-600">
        Your payment is being confirmed. You will receive a confirmation email shortly with your
        registration reference.
      </p>
      {orderId ? <p className="mt-2 text-sm text-neutral-500">Order reference: {orderId}</p> : null}
      <p className="mt-8">
        <Link
          href="/registrations/lookup"
          className="underline transition-colors duration-fast ease-premium hover:text-primary-950"
        >
          Look up your registration
        </Link>
      </p>
    </main>
  );
}

import Link from 'next/link';

export default function CheckoutCancelledPage() {
  return (
    <main className="animate-fade-in-up mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Checkout Cancelled</h1>
      <p className="mt-4 text-neutral-600">
        Your payment was not completed. Your ticket reservation will be released automatically if
        you don&apos;t finish checkout.
      </p>
      <p className="mt-8">
        <Link href="/events" className="underline transition-colors duration-fast ease-premium hover:text-primary-950">
          Back to seminars
        </Link>
      </p>
    </main>
  );
}

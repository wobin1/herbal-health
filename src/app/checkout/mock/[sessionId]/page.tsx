import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { MockCheckoutActions } from './mock-checkout-actions';

interface MockCheckoutPageProps {
  params: Promise<{ sessionId: string }>;
}

/**
 * Fake hosted payment page standing in for Stripe Checkout while
 * PAYMENT_PROVIDER=mock. 404s outright when mock mode isn't active so this
 * never becomes a reachable page in a real-Stripe environment.
 */
export default async function MockCheckoutPage({ params }: MockCheckoutPageProps) {
  if (process.env.PAYMENT_PROVIDER !== 'mock') {
    notFound();
  }

  const { sessionId } = await params;
  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: { event: true },
  });
  if (!order || order.status !== 'PENDING') {
    notFound();
  }

  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(
    order.totalMinorUnits / 100,
  );

  return (
    <main className="animate-fade-in-up mx-auto max-w-md px-6 py-20">
      <div className="rounded-xl border border-neutral-200 p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Mock Payment Provider</p>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{order.event.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{order.buyerEmail}</p>
        <p className="mt-6 text-3xl font-semibold text-neutral-900">{amount}</p>
        <p className="mt-2 text-xs text-neutral-500">
          This stands in for Stripe Checkout until the real integration is wired up. No real payment
          is taken.
        </p>
        <MockCheckoutActions sessionId={sessionId} orderId={order.id} />
      </div>
    </main>
  );
}

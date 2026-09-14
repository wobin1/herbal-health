import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env') });

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=20&pool_timeout=20`;
}

/**
 * Real-Postgres integration test: proves that two truly concurrent
 * deliveries of the same Stripe webhook event produce exactly one Payment
 * and one Registration, relying on the DB unique constraint on
 * Payment.providerEventId (not an application-level read-then-write check,
 * which would itself be racy).
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('webhook idempotency under concurrent duplicate delivery (real Postgres)', () => {
  let prisma: import('@prisma/client').PrismaClient;
  let processCheckoutCompleted: typeof import('@/server/services/payment-webhook-service').processCheckoutCompleted;
  let eventId: string;
  let orderId: string;
  let orderItemId: string;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    ({ processCheckoutCompleted } = await import('@/server/services/payment-webhook-service'));

    const event = await prisma.event.create({
      data: {
        slug: `webhook-idem-test-${Date.now()}`,
        title: 'Webhook Idempotency Test Event',
        shortDescription: 'test',
        startAt: new Date(Date.now() + 86_400_000),
        timezone: 'America/New_York',
        city: 'Austin',
        state: 'TX',
        status: 'ON_SALE',
      },
    });
    eventId = event.id;

    const ticketType = await prisma.eventTicketType.create({
      data: { eventId: event.id, name: 'GA', priceMinorUnits: 1000, capacity: 10, reservedCount: 1 },
    });

    const order = await prisma.order.create({
      data: {
        eventId: event.id,
        status: 'PENDING',
        totalMinorUnits: 1000,
        buyerEmail: 'buyer@example.com',
        buyerName: 'Buyer',
        buyerPhone: '555-0100',
        buyerCountry: 'US',
        items: { create: { eventTicketTypeId: ticketType.id, quantity: 1, unitPriceMinorUnits: 1000, subtotalMinorUnits: 1000 } },
      },
      include: { items: true },
    });
    orderId = order.id;
    orderItemId = order.items[0].id;

    await prisma.attendee.create({
      data: {
        orderId,
        orderItemId,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '555-0100',
        country: 'US',
      },
    });
  }, 30_000);

  afterAll(async () => {
    if (!prisma) return;
    await prisma.registration.deleteMany({ where: { eventId } });
    await prisma.attendee.deleteMany({ where: { orderId } });
    await prisma.payment.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { eventId } });
    await prisma.eventTicketType.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.$disconnect();
  });

  it('produces exactly one Payment and one Registration when the same event id arrives twice concurrently', async () => {
    const webhookEvent = {
      type: 'checkout.session.completed' as const,
      providerEventId: `evt_dup_test_${Date.now()}`,
      checkoutSessionId: 'cs_test_1',
      orderId,
      paymentIntentId: 'pi_test_1',
      amountMinorUnits: 1000,
      currency: 'USD',
      raw: {},
    };

    const [first, second] = await Promise.all([
      processCheckoutCompleted(webhookEvent),
      processCheckoutCompleted(webhookEvent),
    ]);

    // Exactly one of the two calls did the real work; the other detected
    // the duplicate via the unique constraint.
    const duplicateFlags = [first.duplicate, second.duplicate].sort();
    expect(duplicateFlags).toEqual([false, true]);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);

    const registrations = await prisma.registration.findMany({ where: { orderId } });
    expect(registrations).toHaveLength(1);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('PAID');
  }, 30_000);
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '../../.env') });

// Raise the connection pool so 10 concurrent interactive transactions don't
// starve each other waiting for a free connection (a test-harness concern,
// not a correctness concern — the assertions below are what prove no oversell).
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=20&pool_timeout=20`;
}

/**
 * Real-Postgres integration test: the concurrent-purchase-no-oversell
 * guarantee genuinely needs transactional isolation, which a mocked Prisma
 * client cannot exercise. Requires DATABASE_URL to point at a real Postgres
 * instance (the project's dev DB by default) — self-skips otherwise so the
 * suite stays green in environments without Postgres, same spirit as the
 * Playwright browser-install self-skip used elsewhere in this repo.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('inventory reservation under concurrency (real Postgres)', () => {
  let prisma: import('@prisma/client').PrismaClient;
  let createPendingOrder: typeof import('@/server/services/order-service').createPendingOrder;
  let eventId: string;
  let ticketTypeId: string;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    ({ createPendingOrder } = await import('@/server/services/order-service'));

    const event = await prisma.event.create({
      data: {
        slug: `concurrency-test-${Date.now()}`,
        title: 'Concurrency Test Event',
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
      data: {
        eventId: event.id,
        name: 'General Admission',
        priceMinorUnits: 2500,
        capacity: 5,
      },
    });
    ticketTypeId = ticketType.id;
  }, 30_000);

  afterAll(async () => {
    if (!prisma) return;
    await prisma.registration.deleteMany({ where: { eventId } });
    await prisma.attendee.deleteMany({ where: { order: { eventId } } });
    await prisma.orderItem.deleteMany({ where: { order: { eventId } } });
    await prisma.registrationTermAcceptance.deleteMany({ where: { order: { eventId } } });
    await prisma.payment.deleteMany({ where: { order: { eventId } } });
    await prisma.order.deleteMany({ where: { eventId } });
    await prisma.eventTicketType.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.$disconnect();
  });

  function attendeesFor(quantity: number) {
    return Array.from({ length: quantity }, (_, i) => ({
      firstName: 'Attendee',
      lastName: String(i),
      email: `attendee-${i}-${Math.random()}@example.com`,
      phone: '555-0100',
      country: 'US',
    }));
  }

  it('never oversells capacity when many buyers race for the same ticket type', async () => {
    // Capacity is 5. Fire 10 concurrent single-ticket purchase attempts.
    const attempts = Array.from({ length: 10 }, () =>
      createPendingOrder(
        {
          eventId,
          ticketTypeId,
          quantity: 1,
          attendees: attendeesFor(1),
          buyerEmail: 'buyer@example.com',
          buyerName: 'Buyer',
          termsVersion: '2026-01-01',
        } as never,
        {},
      ).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      ),
    );

    const results = await Promise.all(attempts);
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded.length).toBe(5);
    expect(failed.length).toBe(5);

    const ticketType = await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketTypeId } });
    expect(ticketType.reservedCount).toBe(5);
    expect(ticketType.reservedCount + ticketType.soldCount).toBeLessThanOrEqual(ticketType.capacity);

    const orderCount = await prisma.order.count({ where: { eventId, status: 'PENDING' } });
    expect(orderCount).toBe(5);
  }, 30_000);
});

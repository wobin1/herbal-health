import type { Prisma, PrismaClient } from '@prisma/client';

export class InsufficientInventoryError extends Error {}

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Atomically checks and reserves inventory for a ticket type inside an
 * already-open transaction. Must be called with a Serializable transaction
 * (see `withSerializableTransaction`) so that two concurrent reservations
 * against the same ticket type can never both succeed past capacity —
 * Postgres detects the write-write conflict and one transaction aborts and
 * retries rather than both committing a read-then-write oversell.
 */
export async function reserveTicketCapacity(
  tx: Tx,
  ticketTypeId: string,
  quantity: number,
): Promise<void> {
  const ticketType = await tx.eventTicketType.findUnique({ where: { id: ticketTypeId } });
  if (!ticketType) {
    throw new InsufficientInventoryError(`Ticket type ${ticketTypeId} not found`);
  }
  const available = ticketType.capacity - ticketType.reservedCount - ticketType.soldCount;
  if (available < quantity) {
    throw new InsufficientInventoryError('Not enough tickets available');
  }
  await tx.eventTicketType.update({
    where: { id: ticketTypeId },
    data: { reservedCount: { increment: quantity } },
  });
}

export async function releaseTicketReservation(
  tx: Tx,
  ticketTypeId: string,
  quantity: number,
): Promise<void> {
  await tx.eventTicketType.update({
    where: { id: ticketTypeId },
    data: { reservedCount: { decrement: quantity } },
  });
}

export async function convertReservationToSale(
  tx: Tx,
  ticketTypeId: string,
  quantity: number,
): Promise<void> {
  await tx.eventTicketType.update({
    where: { id: ticketTypeId },
    data: {
      reservedCount: { decrement: quantity },
      soldCount: { increment: quantity },
    },
  });
}

/** Frees sold capacity back to the pool on a refund/cancellation. */
export async function releaseSoldCapacity(
  tx: Tx,
  ticketTypeId: string,
  quantity: number,
): Promise<void> {
  await tx.eventTicketType.update({
    where: { id: ticketTypeId },
    data: { soldCount: { decrement: quantity } },
  });
}

const RETRYABLE_PRISMA_CODES = new Set(['P2034']); // write conflict / deadlock under Serializable

/**
 * Runs `fn` inside a Serializable transaction, retrying on Prisma's
 * transaction-conflict error. This is what gives the inventory reservation
 * its no-oversell guarantee under concurrency without hand-rolled row
 * locking or raw SQL.
 */
export async function withSerializableTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 10,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: 'Serializable',
        maxWait: 10_000,
        timeout: 10_000,
      });
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      attempt += 1;
      if (code && RETRYABLE_PRISMA_CODES.has(code) && attempt <= maxRetries) {
        // Small jittered backoff to reduce repeated collisions under heavy contention.
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 25 * attempt));
        continue;
      }
      throw error;
    }
  }
}

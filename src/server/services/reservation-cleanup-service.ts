import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { releaseTicketReservation } from '@/server/services/inventory-service';

export interface ExpireReservationsResult {
  expiredOrderIds: string[];
}

/**
 * Releases inventory reservations for PENDING orders whose reservation
 * window has passed, transitioning them to EXPIRED. Intended to be run
 * periodically by an external scheduler (see the /api/jobs/expire-reservations
 * route, gated by CRON_SECRET).
 */
export async function expireStaleReservations(now: Date = new Date()): Promise<ExpireReservationsResult> {
  const staleOrders = await prisma.order.findMany({
    where: { status: 'PENDING', reservationExpiresAt: { lte: now } },
    include: { items: true },
  });

  const expiredOrderIds: string[] = [];

  for (const order of staleOrders) {
    await prisma.$transaction(async (tx) => {
      // Re-check status inside the transaction in case a webhook paid it
      // in the meantime — never expire an order that already succeeded.
      const current = await tx.order.findUnique({ where: { id: order.id } });
      if (!current || current.status !== 'PENDING') return;

      for (const item of order.items) {
        await releaseTicketReservation(tx, item.eventTicketTypeId, item.quantity);
      }
      await tx.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
    });
    expiredOrderIds.push(order.id);
    await recordAuditLog({
      action: 'order.expired',
      entityType: 'Order',
      entityId: order.id,
    });
  }

  return { expiredOrderIds };
}

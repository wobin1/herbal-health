export interface TicketInventory {
  capacity: number;
  reservedCount: number;
  soldCount: number;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
}

export function getSeatsRemaining(
  ticket: Pick<TicketInventory, 'capacity' | 'reservedCount' | 'soldCount'>,
): number {
  return Math.max(0, ticket.capacity - ticket.reservedCount - ticket.soldCount);
}

export function getAvailabilityLabel(seatsRemaining: number): string {
  if (seatsRemaining <= 0) return 'Sold out';
  return seatsRemaining === 1 ? '1 seat left' : `${seatsRemaining} seats left`;
}

export function isTicketPurchasable(ticket: TicketInventory, now: Date): boolean {
  if (getSeatsRemaining(ticket) === 0) return false;
  if (ticket.salesStartAt && ticket.salesStartAt > now) return false;
  if (ticket.salesEndAt && ticket.salesEndAt < now) return false;
  return true;
}

/** Mirrors the server-side limit in the checkout schema. */
export const MAX_TICKETS_PER_ORDER = 10;

export function getMaxQuantity(seatsRemaining: number): number {
  return Math.min(MAX_TICKETS_PER_ORDER, seatsRemaining);
}

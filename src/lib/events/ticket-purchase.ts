import type { EventStatus } from '@prisma/client';
import { isTicketPurchasable, type TicketInventory } from '@/lib/events/availability';

type PricedTicket = TicketInventory & { priceMinorUnits: number; currency: string };

export interface TicketPurchaseState {
  /** True when at least one ticket type can be bought right now. */
  canBuy: boolean;
  /** Lowest price among buyable ticket types, formatted, e.g. "$1,500.00". */
  fromPrice: string | null;
}

/** Whether visitors can buy tickets for an event right now, and from what price. */
export function getTicketPurchaseState(
  event: { status: EventStatus; ticketTypes: PricedTicket[] },
  now: Date,
): TicketPurchaseState {
  if (event.status !== 'ON_SALE') return { canBuy: false, fromPrice: null };
  const buyable = event.ticketTypes.filter((ticket) => isTicketPurchasable(ticket, now));
  if (buyable.length === 0) return { canBuy: false, fromPrice: null };
  const cheapest = buyable.reduce((min, t) => (t.priceMinorUnits < min.priceMinorUnits ? t : min));
  const fromPrice = (cheapest.priceMinorUnits / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: cheapest.currency,
  });
  return { canBuy: true, fromPrice };
}

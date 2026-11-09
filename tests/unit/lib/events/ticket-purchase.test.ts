import { describe, expect, it } from 'vitest';
import { getTicketPurchaseState } from '@/lib/events/ticket-purchase';

const NOW = new Date('2026-11-09T12:00:00Z');
const ticket = (over: Partial<Parameters<typeof getTicketPurchaseState>[0]['ticketTypes'][number]> = {}) => ({
  priceMinorUnits: 150000,
  currency: 'USD',
  capacity: 50,
  reservedCount: 0,
  soldCount: 0,
  salesStartAt: null,
  salesEndAt: null,
  ...over,
});

describe('getTicketPurchaseState', () => {
  it('allows buying an on-sale event with seats, showing the lowest price', () => {
    const state = getTicketPurchaseState(
      { status: 'ON_SALE', ticketTypes: [ticket({ priceMinorUnits: 150000 }), ticket({ priceMinorUnits: 99900 })] },
      NOW,
    );
    expect(state).toEqual({ canBuy: true, fromPrice: '$999.00' });
  });

  it('cannot buy when the event is not on sale', () => {
    expect(getTicketPurchaseState({ status: 'PUBLISHED', ticketTypes: [ticket()] }, NOW).canBuy).toBe(false);
  });

  it('cannot buy when the event has no ticket types yet', () => {
    expect(getTicketPurchaseState({ status: 'ON_SALE', ticketTypes: [] }, NOW)).toEqual({ canBuy: false, fromPrice: null });
  });

  it('ignores ticket types that are sold out or outside their sales window', () => {
    const state = getTicketPurchaseState(
      {
        status: 'ON_SALE',
        ticketTypes: [
          ticket({ priceMinorUnits: 1000, soldCount: 50 }),
          ticket({ priceMinorUnits: 2000, salesStartAt: new Date('2026-12-01T00:00:00Z') }),
          ticket({ priceMinorUnits: 3000, salesEndAt: new Date('2026-11-01T00:00:00Z') }),
          ticket({ priceMinorUnits: 150000 }),
        ],
      },
      NOW,
    );
    expect(state).toEqual({ canBuy: true, fromPrice: '$1,500.00' });
  });

  it('cannot buy when every ticket type is unavailable', () => {
    const state = getTicketPurchaseState({ status: 'ON_SALE', ticketTypes: [ticket({ soldCount: 50 })] }, NOW);
    expect(state.canBuy).toBe(false);
  });
});

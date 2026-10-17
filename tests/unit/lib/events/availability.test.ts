import { describe, expect, it } from 'vitest';
import {
  getSeatsRemaining,
  getAvailabilityLabel,
  isTicketPurchasable,
} from '@/lib/events/availability';

const NOW = new Date('2026-06-01T12:00:00Z');
const ticket = (overrides = {}) => ({
  capacity: 100,
  reservedCount: 10,
  soldCount: 20,
  salesStartAt: null,
  salesEndAt: null,
  ...overrides,
});

describe('getSeatsRemaining', () => {
  it('is capacity minus reserved minus sold', () => {
    expect(getSeatsRemaining(ticket())).toBe(70);
  });

  it('never goes below zero', () => {
    expect(getSeatsRemaining(ticket({ soldCount: 120 }))).toBe(0);
  });
});

describe('getAvailabilityLabel', () => {
  it('says Sold out at zero', () => {
    expect(getAvailabilityLabel(0)).toBe('Sold out');
  });
  it('uses singular for one seat', () => {
    expect(getAvailabilityLabel(1)).toBe('1 seat left');
  });
  it('shows the exact count otherwise', () => {
    expect(getAvailabilityLabel(12)).toBe('12 seats left');
  });
});

describe('isTicketPurchasable', () => {
  it('is true with seats left and no sales window', () => {
    expect(isTicketPurchasable(ticket(), NOW)).toBe(true);
  });
  it('is false when sold out', () => {
    expect(isTicketPurchasable(ticket({ soldCount: 90 }), NOW)).toBe(false);
  });
  it('is false before sales start', () => {
    expect(
      isTicketPurchasable(ticket({ salesStartAt: new Date('2026-07-01T00:00:00Z') }), NOW),
    ).toBe(false);
  });
  it('is false after sales end', () => {
    expect(isTicketPurchasable(ticket({ salesEndAt: new Date('2026-05-01T00:00:00Z') }), NOW)).toBe(
      false,
    );
  });
});

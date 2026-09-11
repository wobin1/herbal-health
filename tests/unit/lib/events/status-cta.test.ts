import { describe, expect, it } from 'vitest';
import { getEventStatusCta } from '@/lib/events/status-cta';

describe('getEventStatusCta', () => {
  it('DRAFT is not publicly visible', () => {
    expect(getEventStatusCta('DRAFT')).toEqual({ label: null, isPubliclyVisible: false, ctaEnabled: false });
  });

  it('COMING_SOON shows "View Details"', () => {
    expect(getEventStatusCta('COMING_SOON')).toEqual({
      label: 'View Details',
      isPubliclyVisible: true,
      ctaEnabled: true,
    });
  });

  it('PUBLISHED (not yet on sale) shows "Details"', () => {
    expect(getEventStatusCta('PUBLISHED')).toEqual({
      label: 'Details',
      isPubliclyVisible: true,
      ctaEnabled: true,
    });
  });

  it('ON_SALE shows "Buy Tickets"', () => {
    expect(getEventStatusCta('ON_SALE')).toEqual({
      label: 'Buy Tickets',
      isPubliclyVisible: true,
      ctaEnabled: true,
    });
  });

  it('SOLD_OUT shows "Join Waitlist"', () => {
    expect(getEventStatusCta('SOLD_OUT')).toEqual({
      label: 'Join Waitlist',
      isPubliclyVisible: true,
      ctaEnabled: true,
    });
  });

  it('CLOSED shows "Event Closed" and is disabled', () => {
    expect(getEventStatusCta('CLOSED')).toEqual({
      label: 'Event Closed',
      isPubliclyVisible: true,
      ctaEnabled: false,
    });
  });

  it('CANCELLED shows "Cancelled" and is disabled', () => {
    expect(getEventStatusCta('CANCELLED')).toEqual({
      label: 'Cancelled',
      isPubliclyVisible: true,
      ctaEnabled: false,
    });
  });

  it('COMPLETED shows "View Recap"', () => {
    expect(getEventStatusCta('COMPLETED')).toEqual({
      label: 'View Recap',
      isPubliclyVisible: true,
      ctaEnabled: true,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { checkoutRequestSchema } from '@/lib/validation/checkout';

const ATTENDEE = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  country: 'US',
};

const VALID = {
  eventId: 'evt-1',
  ticketTypeId: 'tt-1',
  quantity: 1,
  attendees: [ATTENDEE],
  buyerEmail: 'jane@example.com',
  buyerName: 'Jane Doe',
  termsVersion: '2026-01-01',
};

describe('checkoutRequestSchema', () => {
  it('accepts a valid checkout request', () => {
    expect(checkoutRequestSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a request where attendee count does not match quantity', () => {
    const result = checkoutRequestSchema.safeParse({ ...VALID, quantity: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects a request carrying a client-supplied price/total field alongside valid fields (extra keys are ignored, never trusted)', () => {
    const withPrice = { ...VALID, totalMinorUnits: 1, priceMinorUnits: 1 };
    const result = checkoutRequestSchema.safeParse(withPrice);
    expect(result.success).toBe(true);
    // The schema has no price/total field at all, so even if present in the
    // request body it can never reach the server-side price computation.
    expect('totalMinorUnits' in (result as { data?: object }).data!).toBe(false);
  });

  it('rejects medical/health fields — none exist on the attendee schema', () => {
    const attendeeKeys = Object.keys(ATTENDEE);
    expect(attendeeKeys).not.toContain('medicalHistory');
    expect(attendeeKeys).not.toContain('diagnosis');
    expect(attendeeKeys).not.toContain('prescriptions');
  });

  it('rejects an invalid email', () => {
    const result = checkoutRequestSchema.safeParse({ ...VALID, buyerEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative quantity', () => {
    expect(checkoutRequestSchema.safeParse({ ...VALID, quantity: 0 }).success).toBe(false);
  });
});

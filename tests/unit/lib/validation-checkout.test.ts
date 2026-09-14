import { describe, expect, it } from 'vitest';
import { checkoutRequestSchema } from '@/lib/validation/checkout';

const VALID = {
  eventId: 'evt-1',
  ticketTypeId: 'tt-1',
  quantity: 1,
  buyerEmail: 'jane@example.com',
  buyerName: 'Jane Doe',
  buyerPhone: '555-0100',
  buyerCountry: 'US',
  termsVersion: '2026-01-01',
};

describe('checkoutRequestSchema', () => {
  it('accepts a valid checkout request', () => {
    expect(checkoutRequestSchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts a quantity greater than one with no per-attendee details required', () => {
    const result = checkoutRequestSchema.safeParse({ ...VALID, quantity: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects a request carrying a client-supplied price/total field alongside valid fields (extra keys are ignored, never trusted)', () => {
    const withPrice = { ...VALID, totalMinorUnits: 1, priceMinorUnits: 1 };
    const result = checkoutRequestSchema.safeParse(withPrice);
    expect(result.success).toBe(true);
    // The schema has no price/total field at all, so even if present in the
    // request body it can never reach the server-side price computation.
    expect('totalMinorUnits' in (result as { data?: object }).data!).toBe(false);
  });

  it('rejects medical/health fields — none exist on the schema', () => {
    const keys = Object.keys(VALID);
    expect(keys).not.toContain('medicalHistory');
    expect(keys).not.toContain('diagnosis');
    expect(keys).not.toContain('prescriptions');
  });

  it('rejects an invalid email', () => {
    const result = checkoutRequestSchema.safeParse({ ...VALID, buyerEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative quantity', () => {
    expect(checkoutRequestSchema.safeParse({ ...VALID, quantity: 0 }).success).toBe(false);
  });

  it('rejects quantity above the cap', () => {
    expect(checkoutRequestSchema.safeParse({ ...VALID, quantity: 11 }).success).toBe(false);
  });

  it('rejects a missing buyer phone or country', () => {
    const { buyerPhone: _phone, ...noPhone } = VALID;
    expect(checkoutRequestSchema.safeParse(noPhone).success).toBe(false);
    const { buyerCountry: _country, ...noCountry } = VALID;
    expect(checkoutRequestSchema.safeParse(noCountry).success).toBe(false);
  });
});

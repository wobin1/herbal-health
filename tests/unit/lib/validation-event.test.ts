import { describe, expect, it } from 'vitest';
import { eventCreateSchema, eventUpdateSchema } from '@/lib/validation/event';

const VALID = {
  slug: 'herbal-101',
  title: 'Herbal 101',
  shortDescription: 'Short',
  startAt: '2026-12-06T18:00:00.000Z',
  timezone: 'America/Los_Angeles',
  city: 'Portland',
  state: 'OR',
};

describe('event timezone validation', () => {
  it('accepts a real IANA timezone', () => {
    expect(eventCreateSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a timezone the runtime does not recognise', () => {
    expect(eventCreateSchema.safeParse({ ...VALID, timezone: 'Portland' }).success).toBe(false);
    expect(eventUpdateSchema.safeParse({ timezone: 'Not/AZone' }).success).toBe(false);
  });
});

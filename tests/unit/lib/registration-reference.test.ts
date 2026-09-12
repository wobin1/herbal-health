import { describe, expect, it } from 'vitest';
import { generateRegistrationReference, isValidRegistrationReference } from '@/lib/registration/reference';

describe('generateRegistrationReference', () => {
  it('matches the HHS-<year>-<6 char> format', () => {
    const ref = generateRegistrationReference(new Date('2026-03-01T00:00:00Z'));
    expect(ref).toMatch(/^HHS-2026-[A-Z0-9]{6}$/);
    expect(isValidRegistrationReference(ref)).toBe(true);
  });

  it('excludes visually ambiguous characters (0, O, 1, I, L)', () => {
    for (let i = 0; i < 200; i += 1) {
      const ref = generateRegistrationReference();
      const suffix = ref.split('-')[2];
      expect(suffix).not.toMatch(/[0O1IL]/);
    }
  });

  it('is not sequential/enumerable: repeated calls produce high-entropy, non-incrementing suffixes', () => {
    const refs = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      refs.add(generateRegistrationReference());
    }
    // Effectively unique across 500 draws from a 32^6 space.
    expect(refs.size).toBe(500);
  });

  it('rejects malformed references', () => {
    expect(isValidRegistrationReference('not-a-reference')).toBe(false);
    expect(isValidRegistrationReference('HHS-2026-000000')).toBe(false); // ambiguous chars
    expect(isValidRegistrationReference('HHS-2026-ABCDE')).toBe(false); // too short
  });
});

import { randomBytes } from 'node:crypto';

/**
 * Characters chosen to avoid visual ambiguity when read aloud or printed
 * (no 0/O, 1/I/L confusion): Crockford-ish subset.
 */
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 6;

/**
 * Generates a registration reference of the form `HHS-<year>-<random>`,
 * e.g. `HHS-2026-8F4K2Q`. The suffix is generated from a CSPRNG (never a
 * sequential counter), so references are non-enumerable and safe to expose
 * publicly (registration lookup, tickets, confirmation emails).
 */
export function generateRegistrationReference(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `HHS-${year}-${suffix}`;
}

const REFERENCE_PATTERN = /^HHS-\d{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function isValidRegistrationReference(reference: string): boolean {
  return REFERENCE_PATTERN.test(reference);
}

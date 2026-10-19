import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return secret;
}

export function generateLoginCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Keyed hash so a leaked database row can't be brute-forced offline without AUTH_SECRET. */
export function hashLoginCode(code: string): string {
  return createHmac('sha256', getSecret()).update(code).digest('base64url');
}

export function loginCodeMatches(codeHash: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const expected = Buffer.from(codeHash);
  const actual = Buffer.from(hashLoginCode(code));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Gated solely on DEV_MFA_BYPASS_CODE being configured, not on NODE_ENV:
 * Next.js sets NODE_ENV=production for every built/deployed app, including
 * a staging deployment with no real customers yet, so that check couldn't
 * actually distinguish staging from production. This means the deployment
 * where DEV_MFA_BYPASS_CODE is set has an MFA master key — that env var
 * MUST be removed once this app serves real customers.
 */
export function isMfaBypassCode(code: string): boolean {
  return (
    /^\d{6}$/.test(code) &&
    Boolean(process.env.DEV_MFA_BYPASS_CODE) &&
    code === process.env.DEV_MFA_BYPASS_CODE
  );
}

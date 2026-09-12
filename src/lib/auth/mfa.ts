import { Secret, TOTP } from 'otpauth';

const ISSUER = 'Herbal Health Seminar Series';

export function generateMfaSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function buildProvisioningUri(email: string, base32Secret: string): string {
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    secret: Secret.fromBase32(base32Secret),
  });
  return totp.toString();
}

/**
 * Gated solely on DEV_MFA_BYPASS_CODE being configured, not on NODE_ENV:
 * Next.js sets NODE_ENV=production for every built/deployed app, including
 * a staging deployment with no real customers yet, so that check couldn't
 * actually distinguish staging from production. This means the deployment
 * where DEV_MFA_BYPASS_CODE is set has an MFA master key — that env var
 * MUST be removed once this app serves real customers.
 */
export function verifyMfaToken(base32Secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;

  if (process.env.DEV_MFA_BYPASS_CODE && token === process.env.DEV_MFA_BYPASS_CODE) {
    return true;
  }

  const totp = new TOTP({ secret: Secret.fromBase32(base32Secret) });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

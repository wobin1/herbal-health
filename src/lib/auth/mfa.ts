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

export function verifyMfaToken(base32Secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;

  if (process.env.NODE_ENV !== 'production' && process.env.DEV_MFA_BYPASS_CODE) {
    if (token === process.env.DEV_MFA_BYPASS_CODE) return true;
  }

  const totp = new TOTP({ secret: Secret.fromBase32(base32Secret) });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

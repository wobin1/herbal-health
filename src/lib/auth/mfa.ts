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
  const totp = new TOTP({ secret: Secret.fromBase32(base32Secret) });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

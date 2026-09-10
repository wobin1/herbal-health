import { describe, expect, it } from 'vitest';
import { TOTP, Secret } from 'otpauth';
import { generateMfaSecret, verifyMfaToken, buildProvisioningUri } from '@/lib/auth/mfa';

describe('MFA (TOTP)', () => {
  it('accepts the currently valid code for a generated secret', () => {
    const secret = generateMfaSecret();
    const totp = new TOTP({ secret: Secret.fromBase32(secret) });
    const code = totp.generate();

    expect(verifyMfaToken(secret, code)).toBe(true);
  });

  it('rejects an incorrect code', () => {
    const secret = generateMfaSecret();
    expect(verifyMfaToken(secret, '000000')).toBe(false);
  });

  it('rejects malformed input', () => {
    const secret = generateMfaSecret();
    expect(verifyMfaToken(secret, 'abcdef')).toBe(false);
    expect(verifyMfaToken(secret, '12345')).toBe(false);
  });

  it('builds a provisioning URI containing the issuer and account label', () => {
    const secret = generateMfaSecret();
    const uri = buildProvisioningUri('admin@herbalhealth.test', secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(encodeURIComponent('admin@herbalhealth.test'));
  });
});

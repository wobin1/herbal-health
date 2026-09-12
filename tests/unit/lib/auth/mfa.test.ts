import { afterEach, describe, expect, it, vi } from 'vitest';
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

  describe('DEV_MFA_BYPASS_CODE', () => {
    const ORIGINAL_ENV = { ...process.env };

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
      vi.unstubAllEnvs();
    });

    it('is never accepted when DEV_MFA_BYPASS_CODE is not configured, regardless of NODE_ENV', () => {
      delete process.env.DEV_MFA_BYPASS_CODE;
      const secret = generateMfaSecret();
      expect(verifyMfaToken(secret, '000000')).toBe(false);
    });

    it('accepts the configured bypass code even when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.DEV_MFA_BYPASS_CODE = '000000';
      const secret = generateMfaSecret();
      expect(verifyMfaToken(secret, '000000')).toBe(true);
    });

    it('rejects a code that does not match the configured bypass code', () => {
      process.env.DEV_MFA_BYPASS_CODE = '000000';
      const secret = generateMfaSecret();
      expect(verifyMfaToken(secret, '111111')).toBe(false);
    });
  });
});

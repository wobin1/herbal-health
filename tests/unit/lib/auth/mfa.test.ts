import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  generateLoginCode,
  hashLoginCode,
  loginCodeMatches,
  isMfaBypassCode,
} from '@/lib/auth/mfa';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-value-not-for-production';
});

describe('MFA (emailed login code)', () => {
  it('generates a 6-digit numeric code', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateLoginCode()).toMatch(/^\d{6}$/);
    }
  });

  it('does not store the code in plain text', () => {
    const code = generateLoginCode();
    const hash = hashLoginCode(code);
    expect(hash).not.toContain(code);
  });

  it('matches the code that was hashed', () => {
    const code = '123456';
    expect(loginCodeMatches(hashLoginCode(code), code)).toBe(true);
  });

  it('rejects a different code', () => {
    expect(loginCodeMatches(hashLoginCode('123456'), '654321')).toBe(false);
  });

  it('rejects malformed input', () => {
    const hash = hashLoginCode('123456');
    expect(loginCodeMatches(hash, 'abcdef')).toBe(false);
    expect(loginCodeMatches(hash, '12345')).toBe(false);
  });

  describe('DEV_MFA_BYPASS_CODE', () => {
    const ORIGINAL_ENV = { ...process.env };

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
      vi.unstubAllEnvs();
    });

    it('is never accepted when DEV_MFA_BYPASS_CODE is not configured, regardless of NODE_ENV', () => {
      delete process.env.DEV_MFA_BYPASS_CODE;
      expect(isMfaBypassCode('000000')).toBe(false);
    });

    it('accepts the configured bypass code even when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.DEV_MFA_BYPASS_CODE = '000000';
      expect(isMfaBypassCode('000000')).toBe(true);
    });

    it('rejects a code that does not match the configured bypass code', () => {
      process.env.DEV_MFA_BYPASS_CODE = '000000';
      expect(isMfaBypassCode('111111')).toBe(false);
    });
  });
});

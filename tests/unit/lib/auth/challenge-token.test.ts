import { beforeAll, describe, expect, it } from 'vitest';
import { issueChallengeToken, verifyChallengeToken } from '@/lib/auth/challenge-token';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-value-not-for-production';
});

describe('challenge tokens', () => {
  it('round-trips the admin user id and mode', () => {
    const token = issueChallengeToken('admin-1', 'mfa_required');
    const result = verifyChallengeToken(token);
    expect(result).toEqual({ adminUserId: 'admin-1', mode: 'mfa_required' });
  });

  it('rejects a tampered token', () => {
    const token = issueChallengeToken('admin-1', 'mfa_required');
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(verifyChallengeToken(tampered)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyChallengeToken('not-a-real-token')).toBeNull();
  });
});

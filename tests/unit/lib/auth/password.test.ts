import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('hashes with argon2id and verifies the correct password', async () => {
    const hash = await hashPassword('Sup3r-Secret-Passw0rd!');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'Sup3r-Secret-Passw0rd!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('never returns the plaintext or a reversible value', async () => {
    const hash = await hashPassword('another-password');
    expect(hash).not.toContain('another-password');
  });
});

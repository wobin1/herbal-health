import { createHmac, timingSafeEqual } from 'node:crypto';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type ChallengeMode = 'mfa_required' | 'mfa_setup';

interface ChallengePayload {
  sub: string;
  mode: ChallengeMode;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function issueChallengeToken(adminUserId: string, mode: ChallengeMode): string {
  const payload: ChallengePayload = {
    sub: adminUserId,
    mode,
    exp: Date.now() + CHALLENGE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyChallengeToken(token: string): { adminUserId: string; mode: ChallengeMode } | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expectedSignature = sign(body);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload: ChallengePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.exp < Date.now()) return null;
  return { adminUserId: payload.sub, mode: payload.mode };
}

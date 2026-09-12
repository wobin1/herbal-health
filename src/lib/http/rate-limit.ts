/**
 * Minimal in-memory fixed-window rate limiter for public endpoints
 * (checkout creation, webhook receiver, registration lookup). Not a
 * speculative general framework — just enough to cap abuse per CLAUDE.md's
 * "rate-limit public endpoints" rule. In a multi-instance deployment this
 * would need a shared store (e.g. Redis); acceptable for current scale.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

export function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for') ?? 'unknown';
}

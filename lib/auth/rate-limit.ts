// lib/auth/rate-limit.ts — in-memory sliding-window login throttle.
//
// Limits login attempts to MAX per WINDOW, keyed by IP+email, to blunt
// brute-force / credential-stuffing.
//
// HONEST LIMITATIONS (do not treat this as bulletproof):
//   - In-memory: the counter resets on server restart, and is NOT shared across
//     processes. Under PM2 cluster mode or multiple VPS instances each process
//     has its own map, so the effective limit multiplies by instance count.
//   - For a single-instance PM2 setup this is adequate. When you scale out,
//     move this to Redis or a DB table (same interface).
//   - Memory is bounded by pruning expired buckets on each call.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 1000 * 60 * 10; // 10 minutes

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

// Record an attempt for `key`. Returns whether it is allowed and how many
// remain. Call this on EACH login attempt (before verifying the password) so
// failed attempts count toward the limit.
export function consumeRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  // prune expired buckets opportunistically
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterMs: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= MAX_ATTEMPTS;
  return {
    allowed,
    remaining: Math.max(0, MAX_ATTEMPTS - existing.count),
    retryAfterMs: allowed ? 0 : existing.resetAt - now,
  };
}

// Clear the counter for a key (call on SUCCESSFUL login so a good user isn't
// penalized by earlier typos).
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// test-only: wipe all state
export function __clearAllRateLimits(): void {
  buckets.clear();
}

export { MAX_ATTEMPTS, WINDOW_MS };

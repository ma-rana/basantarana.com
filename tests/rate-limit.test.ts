// tests/rate-limit.test.ts — sliding-window login throttle.

import { describe, it, expect, beforeEach } from "vitest";
import {
  consumeRateLimit,
  resetRateLimit,
  __clearAllRateLimits,
  MAX_ATTEMPTS,
  WINDOW_MS,
} from "../lib/auth/rate-limit";

beforeEach(() => __clearAllRateLimits());

describe("rate limiter", () => {
  it("allows up to MAX_ATTEMPTS then blocks", () => {
    const key = "1.2.3.4:user@example.com";
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(consumeRateLimit(key).allowed).toBe(true);
    }
    // the next one is over the limit
    const blocked = consumeRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const key = "1.2.3.4:user@example.com";
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i++) consumeRateLimit(key, t0);
    expect(consumeRateLimit(key, t0).allowed).toBe(false);
    // after the window, a fresh attempt is allowed again
    expect(consumeRateLimit(key, t0 + WINDOW_MS + 1).allowed).toBe(true);
  });

  it("resetRateLimit clears a key (used on successful login)", () => {
    const key = "1.2.3.4:user@example.com";
    for (let i = 0; i < MAX_ATTEMPTS; i++) consumeRateLimit(key);
    expect(consumeRateLimit(key).allowed).toBe(false);
    resetRateLimit(key);
    expect(consumeRateLimit(key).allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const a = "1.1.1.1:a@example.com";
    const b = "2.2.2.2:b@example.com";
    for (let i = 0; i < MAX_ATTEMPTS; i++) consumeRateLimit(a);
    expect(consumeRateLimit(a).allowed).toBe(false);
    expect(consumeRateLimit(b).allowed).toBe(true); // b unaffected
  });
});

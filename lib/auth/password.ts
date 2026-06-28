// lib/auth/password.ts — password hashing with argon2id.
//
// argon2id is the OWASP-recommended algorithm (2025/2026). The library handles
// a unique per-user salt and constant-time verification internally, and stores
// algorithm + params + salt inside the encoded hash string, so the DB column
// only needs to hold that one string. NEVER store plaintext.
//
// Params follow OWASP's minimum for argon2id: 19 MiB memory, 2 iterations,
// parallelism 1. Tune upward later if the server can afford it.

import argon2 from "argon2";

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB = 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, OPTIONS);
}

// Returns true iff the plaintext matches the stored hash. argon2.verify is
// constant-time, so this does not leak timing information.
export function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}

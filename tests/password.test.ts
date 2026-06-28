// tests/password.test.ts — argon2id hash/verify round-trip.

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth/password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("produces argon2id hashes (not plaintext)", async () => {
    const hash = await hashPassword("secret");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("secret");
  });

  it("produces a different hash each time (unique salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});

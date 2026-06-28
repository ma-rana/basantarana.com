// tests/session.test.ts — DB-backed session lifecycle.
//
// Touches the database, so it needs a running Postgres + generated Prisma
// client (same as the seed). Run locally with `npm test`. It creates a throwaway
// user, exercises create/validate/expire/invalidate, and cleans up after itself.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../lib/db";
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
} from "../lib/auth/session";
import { createHash } from "node:crypto";

let userId: string;

beforeAll(async () => {
  const user = await db.user.create({
    data: {
      email: `session-test-${Date.now()}@example.com`,
      password: "x", // not used in these tests
      role: "ADMIN",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await db.session.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("session lifecycle", () => {
  it("creates a session and validates its token, returning the user", async () => {
    const token = generateSessionToken();
    await createSession(token, userId);
    const { session, user } = await validateSessionToken(token);
    expect(session).not.toBeNull();
    expect(user?.id).toBe(userId);
  });

  it("stores the sha256 of the token as the id, not the token itself", async () => {
    const token = generateSessionToken();
    const { id } = await createSession(token, userId);
    expect(id).toBe(createHash("sha256").update(token).digest("hex"));
    expect(id).not.toBe(token);
  });

  it("rejects an unknown / garbage token", async () => {
    const { session, user } = await validateSessionToken("not-a-real-token");
    expect(session).toBeNull();
    expect(user).toBeNull();
  });

  it("rejects (and deletes) an expired session", async () => {
    const token = generateSessionToken();
    const id = createHash("sha256").update(token).digest("hex");
    await db.session.create({
      data: { id, userId, expiresAt: new Date(Date.now() - 1000) }, // already expired
    });
    const { session } = await validateSessionToken(token);
    expect(session).toBeNull();
    const stillThere = await db.session.findUnique({ where: { id } });
    expect(stillThere).toBeNull(); // expired row was cleaned up
  });

  it("invalidateSession makes a valid session stop validating (logout)", async () => {
    const token = generateSessionToken();
    const { id } = await createSession(token, userId);
    expect((await validateSessionToken(token)).user).not.toBeNull();
    await invalidateSession(id);
    expect((await validateSessionToken(token)).user).toBeNull();
  });
});

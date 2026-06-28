// lib/auth/session.ts — DB-backed session lifecycle (Lucia pattern).
//
// THE KEY IDEA: the random token goes in the user's cookie; we store only its
// SHA-256 hash as the Session row id. So even a full DB leak exposes no usable
// tokens (an attacker would still need to reverse SHA-256). Logout / expiry is
// a real server-side DELETE — sessions can be invalidated, unlike stateless JWTs.

import { randomBytes, createHash } from "node:crypto";
import { db } from "../db";
import type { User } from "../../app/generated/prisma/client";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RENEW_THRESHOLD_MS = SESSION_TTL_MS / 2; // slide renewal at half-life

export type SessionValidationResult =
  | { session: { id: string; userId: string; expiresAt: Date }; user: User }
  | { session: null; user: null };

// Raw token for the cookie. ~25 bytes of entropy, URL-safe.
export function generateSessionToken(): string {
  return randomBytes(25).toString("base64url");
}

// The DB id is the hash of the token. Same function used on create and lookup.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(token: string, userId: string) {
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { id, userId, expiresAt } });
  return { id, userId, expiresAt };
}

// Validate a raw token from the cookie. Returns the user if valid; deletes and
// returns null if expired; slides the expiry forward if past the half-life.
export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const id = hashToken(token);
  const row = await db.session.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!row) return { session: null, user: null };

  // Expired -> remove and reject.
  if (Date.now() >= row.expiresAt.getTime()) {
    await db.session.delete({ where: { id } });
    return { session: null, user: null };
  }

  // Past half-life -> extend (sliding window), so active users stay logged in.
  let expiresAt = row.expiresAt;
  if (Date.now() >= row.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.session.update({ where: { id }, data: { expiresAt } });
  }

  return {
    session: { id: row.id, userId: row.userId, expiresAt },
    user: row.user,
  };
}

// Logout: real server-side invalidation.
export async function invalidateSession(sessionId: string): Promise<void> {
  await db.session.deleteMany({ where: { id: sessionId } });
}

// Invalidate every session for a user (e.g. password change, "log out everywhere").
export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

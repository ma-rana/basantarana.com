// lib/auth/cookies.ts — session cookie management (Next.js server side).
//
// COOKIE SCOPING (requirement): the cookie must be bound to admin.basantarana.com
// EXACTLY, not .basantarana.com. The way to do that is to OMIT the `domain`
// attribute entirely. A cookie with no domain is "host-only": the browser sends
// it back only to the exact host that set it. Setting domain=".basantarana.com"
// would (wrongly) share it with the public site and every subdomain. So we set
// NO domain on purpose. ADMIN_COOKIE_DOMAIN in env is kept for reference/other
// uses but is deliberately NOT applied here.
//
// Flags: httpOnly (no JS access -> XSS can't read it), secure (HTTPS only),
// sameSite=lax (sent on top-level nav, blocks most CSRF).

import { cookies } from "next/headers";
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  type SessionValidationResult,
} from "./session";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches session.ts

// Create a session for userId and write the cookie. Returns the raw token.
export async function createSessionCookie(userId: string): Promise<void> {
  const token = generateSessionToken();
  await createSession(token, userId);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    // domain: intentionally omitted -> host-only (admin.basantarana.com exactly)
  });
}

// Clear the cookie (after invalidating the session row in the action).
export async function deleteSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// Read + validate the current session from the cookie.
export async function getCurrentSession(): Promise<SessionValidationResult> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return { session: null, user: null };
  return validateSessionToken(token);
}

export { COOKIE_NAME };

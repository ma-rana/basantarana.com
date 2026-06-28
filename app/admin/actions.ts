"use server";

// app/admin/actions.ts — auth server actions.
// SECURITY: every action validates input with Zod and re-checks auth where
// needed. Login is rate-limited and uses constant-time password verification.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginSchema } from "../../lib/schemas/auth";
import { db } from "../../lib/db";
import { verifyPassword } from "../../lib/auth/password";
import { createSessionCookie, deleteSessionCookie, getCurrentSession } from "../../lib/auth/cookies";
import { invalidateSession } from "../../lib/auth/session";
import { consumeRateLimit, resetRateLimit } from "../../lib/auth/rate-limit";

export type LoginState = { error: string | null };

async function clientIp(): Promise<string> {
  const h = await headers();
  // x-forwarded-for is set by Nginx in production; fall back for local dev.
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }
  const { email, password } = parsed.data;

  // Rate-limit BEFORE verifying, keyed by ip+email, so failed tries count.
  const ip = await clientIp();
  const key = `${ip}:${email.toLowerCase()}`;
  const limit = consumeRateLimit(key);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterMs / 60000);
    return { error: `Too many attempts. Try again in about ${mins} minute(s).` };
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always run a verify to keep timing uniform whether or not the user exists.
  // (If no user, compare against a dummy hash so we don't short-circuit.)
  const DUMMY_HASH =
    "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$3s8m1Qe0p2u3v4w5x6y7z8A9B0C1D2E3F4G5H6I7J8K";
  const ok = user
    ? await verifyPassword(user.password, password)
    : await verifyPassword(DUMMY_HASH, password).catch(() => false);

  if (!user || !ok) {
    // Generic message — never reveal which field was wrong.
    return { error: "Invalid email or password." };
  }

  // Success: clear the throttle and issue a session.
  resetRateLimit(key);
  await createSessionCookie(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const { session } = await getCurrentSession();
  if (session) {
    await invalidateSession(session.id); // real server-side invalidation
  }
  await deleteSessionCookie();
  redirect("/admin/login");
}

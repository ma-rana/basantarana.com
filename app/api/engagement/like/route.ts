// app/api/engagement/like/route.ts
//
// The like HANDLER. A project page's like form POSTs here with the slug. We
// ensure an anonymous `like_session` cookie (so the same visitor can't inflate
// the count), record the like idempotently (the unique index makes a repeat a
// no-op), then redirect back to the project page.
//
// Anonymous + cookie-based: no login required. "Idempotent-ish" — a visitor who
// clears cookies can like again, which is acceptable for a portfolio.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { LikeInputSchema } from "../../../../lib/schemas/engagement";
import { recordLike } from "../../../../lib/repos/engagement";

const COOKIE = "like_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const rawSlug = (form.get("slug") as string) ?? "";

  // Ensure a session id (reuse the cookie if present, else mint one).
  let sessionId = req.cookies.get(COOKIE)?.value ?? "";
  let setCookie = false;
  if (!sessionId || sessionId.length < 8) {
    sessionId = randomBytes(24).toString("hex");
    setCookie = true;
  }

  const parsed = LikeInputSchema.safeParse({ targetId: rawSlug, sessionId });
  const back = rawSlug && /^[a-z0-9-]+$/.test(rawSlug) ? `/projects/${rawSlug}` : "/";

  if (parsed.success) {
    await recordLike(parsed.data.targetId, parsed.data.sessionId);
  }

  const res = NextResponse.redirect(new URL(`${back}?liked=1`, req.url), 303);
  if (setCookie) {
    res.cookies.set(COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: ONE_YEAR,
      path: "/",
    });
  }
  return res;
}

// app/api/contact/route.ts
//
// The contact-form HANDLER. The form in contact.html POSTs here. The theme file
// SHOWS the form; this code receives it, applies spam protection, validates with
// Zod, saves the message, and redirects back to /contact with ?sent=1 (success)
// or ?error=1 (failure) so the page can show {{ formStatus }}.
//
// Spam protection (two layers, no third party):
//   1. Honeypot — a hidden "website" field real users never fill. If it has any
//      value, we assume a bot and silently pretend success (so bots can't learn
//      they were caught). The built-in themes include this hidden field.
//   2. Rate-limit — per-IP sliding window (reuses the login throttle util), so a
//      single source can't flood the inbox. Over the limit -> error redirect.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createMessage } from "../../../lib/repos/contact";
import { consumeRateLimit } from "../../../lib/auth/rate-limit";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  message: z.string().trim().min(1).max(5000),
});

// Best-effort client IP behind a reverse proxy. On the VPS the app sits behind
// nginx/Caddy, so the real client is in x-forwarded-for (first hop); fall back
// to x-real-ip, then a constant so the limiter still works if headers are absent
// (all unknown clients then share one bucket — conservative, not permissive).
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const sent = () => NextResponse.redirect(new URL("/contact?sent=1", req.url), 303);
  const failed = () => NextResponse.redirect(new URL("/contact?error=1", req.url), 303);

  try {
    const form = await req.formData();

    // 1. Honeypot: a hidden field bots fill and humans don't. Pretend success.
    const honeypot = (form.get("website") as string | null)?.trim();
    if (honeypot) return sent();

    // 2. Rate-limit per IP: 5 messages / 10 min (the util's defaults).
    const { allowed } = consumeRateLimit(`contact:${clientIp(req)}`);
    if (!allowed) return failed();

    const parsed = ContactSchema.parse({
      name: form.get("name"),
      email: form.get("email"),
      message: form.get("message"),
    });

    await createMessage(parsed.name, parsed.email, parsed.message);
    return sent();
  } catch {
    return failed();
  }
}

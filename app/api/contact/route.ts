// app/api/contact/route.ts
//
// The contact-form HANDLER. The form in contact.html POSTs here. The theme file
// SHOWS the form; this code receives it, validates with Zod, saves the message,
// and redirects back to /contact with ?sent=1 (success) or ?error=1 (failure)
// so the page can show {{ formStatus }}.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  message: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const parsed = ContactSchema.parse({
      name: form.get("name"),
      email: form.get("email"),
      message: form.get("message"),
    });

    await db.contactMessage.create({ data: parsed });

    return NextResponse.redirect(new URL("/contact?sent=1", req.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/contact?error=1", req.url), 303);
  }
}

// NOTE: consider rate-limiting this endpoint and adding spam protection before
// going live (the same in-memory limiter pattern used for login, or a DB/Redis
// store). For now it validates + saves; you read submissions in the admin later.

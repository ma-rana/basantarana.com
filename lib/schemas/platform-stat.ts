// lib/schemas/platform-stat.ts — Zod validation for PlatformStats.
// `value` is the manual number (and the fallback). Optionally, a stat can fetch
// a LIVE number: set apiUrl (the endpoint) + apiPath (where the number lives in
// the JSON response). Blank apiUrl = manual stat, exactly as before.

import { z } from "zod";

// Empty string from a form field -> undefined (so "optional" actually triggers).
const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const PlatformStatInputSchema = z.object({
  platform: z.string().min(1, "Platform is required.").max(40), // "github", "youtube"
  label: z.string().min(1, "Label is required.").max(60), // "Followers", "Subscribers"
  value: z
    .number({ error: "Value must be a number." })
    .int("Value must be a whole number.")
    .min(0, "Value can’t be negative.")
    .max(2_000_000_000, "Value is too large."),
  order: z.number().int().min(0).max(100000).default(0),

  // --- Optional live-stat config ---
  // The endpoint to fetch. Must be http(s). MAY contain an API key (e.g.
  // YouTube) — it's stored server-side and never rendered to themes.
  apiUrl: z.preprocess(
    emptyToUndef,
    z.url("API URL must be a valid http(s) URL.").max(500).optional(),
  ),
  // Dot-path into the JSON response to the number, e.g. "followers" or
  // "items.0.statistics.subscriberCount". Letters, numbers, dots, underscores.
  apiPath: z.preprocess(
    emptyToUndef,
    z
      .string()
      .max(200)
      .regex(/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/, "Path looks like a.b.0.c")
      .optional(),
  ),
});
export type PlatformStatInput = z.infer<typeof PlatformStatInputSchema>;

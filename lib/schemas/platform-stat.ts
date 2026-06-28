// lib/schemas/platform-stat.ts — Zod validation for PlatformStats.
// Flat fields, manual values (no API fetching this phase). The DB has a
// @@unique([platform, label]) constraint; the repo handles that clash.

import { z } from "zod";

export const PlatformStatInputSchema = z.object({
  platform: z.string().min(1, "Platform is required.").max(40), // "github", "youtube"
  label: z.string().min(1, "Label is required.").max(60), // "Followers", "Subscribers"
  value: z
    .number({ error: "Value must be a number." })
    .int("Value must be a whole number.")
    .min(0, "Value can’t be negative.")
    .max(2_000_000_000, "Value is too large."),
  order: z.number().int().min(0).max(100000).default(0),
});
export type PlatformStatInput = z.infer<typeof PlatformStatInputSchema>;

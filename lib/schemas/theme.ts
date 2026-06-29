// lib/schemas/theme.ts — validation for creating an uploaded theme.

import { z } from "zod";

export const CreateThemeSchema = z.object({
  key: z
    .string()
    .min(2, "Key must be at least 2 characters.")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  name: z.string().min(1, "Name is required.").max(80),
});
export type CreateThemeInput = z.infer<typeof CreateThemeSchema>;

// A single entry in a theme's "expected files" checklist. `name` is the filename
// the author plans to upload (e.g. "home.html", "skills.html", "blog.css");
// `label` is a short human description of its role ("Landing page"). The name is
// kept loose on purpose — it may be one of the engine's six real files OR a
// custom name the engine doesn't read (tracking-only). We still constrain it to
// a safe, filename-ish shape so the checklist can't hold junk or path tricks.
export const ExpectedFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Filename is required.")
    .max(60)
    .regex(
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/,
      "Use a simple filename like home.html or style.css (letters, numbers, - _ , one dot).",
    ),
  label: z.string().trim().max(60).default(""),
});
export type ExpectedFile = z.infer<typeof ExpectedFileSchema>;

// The whole list. Capped so the UI stays sane; de-duplication by name happens in
// the action before save.
export const ExpectedFilesSchema = z.array(ExpectedFileSchema).max(40);
export type ExpectedFiles = z.infer<typeof ExpectedFilesSchema>;

// Parse whatever is stored in Theme.expectedFiles (Json) into a clean list,
// tolerating older rows / bad data by falling back to []. Use this on READ.
export function parseExpectedFiles(raw: unknown): ExpectedFiles {
  const result = ExpectedFilesSchema.safeParse(raw);
  return result.success ? result.data : [];
}

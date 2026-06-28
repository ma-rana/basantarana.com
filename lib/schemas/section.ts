// lib/schemas/section.ts — Zod validation for Sections (home-page composition).
//
// Sections control which bands appear on the public HOME page, and in what
// order. The six types are fixed (seeded); the admin toggles/reorders them.
// `config` is a minimal, permissive JSONB blob for now — validated as an object
// but with no required per-type shape yet (add specific schemas when a real use
// appears). It defaults to {} so the column is always well-formed.

import { z } from "zod";

export const SECTION_TYPES = [
  "HERO",
  "ABOUT",
  "PROJECTS",
  "SKILLS",
  "STATS",
  "CONTACT",
] as const;

export const SectionTypeSchema = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof SectionTypeSchema>;

// Permissive for now: an object of arbitrary keys. Kept so the structure exists
// and writes are validated, without inventing speculative per-type fields.
export const SectionConfigSchema = z
  .record(z.string(), z.unknown())
  .default({});
export type SectionConfig = z.infer<typeof SectionConfigSchema>;

export const SectionInputSchema = z.object({
  type: SectionTypeSchema,
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(100000).default(0),
  config: SectionConfigSchema,
});
export type SectionInput = z.infer<typeof SectionInputSchema>;

// Human-friendly labels + one-line descriptions for the admin UI.
export const SECTION_META: Record<SectionType, { label: string; blurb: string }> = {
  HERO: { label: "Hero", blurb: "Name, headline, intro, and call-to-action." },
  ABOUT: { label: "About", blurb: "Longer bio and background." },
  PROJECTS: { label: "Projects", blurb: "Your published project list." },
  SKILLS: { label: "Skills", blurb: "Skills grouped by category." },
  STATS: { label: "Platform stats", blurb: "Follower/subscriber numbers." },
  CONTACT: { label: "Contact", blurb: "A prompt to get in touch." },
};

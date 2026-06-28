// lib/schemas/profile.ts
// Zod schemas for JSONB fields. This is the pattern that keeps JSONB safe:
// Postgres stores it as opaque JSON; Zod guarantees the SHAPE on write AND
// read. Never trust a JSONB column's contents without parsing it here first.

import { z } from "zod";

// Profile.bioVariants — multiple lengths so each theme picks what fits.
export const BioVariantsSchema = z.object({
  short: z.string().max(160),
  medium: z.string().max(600),
  long: z.string().max(4000),
});
export type BioVariants = z.infer<typeof BioVariantsSchema>;

// A single image with its size variants.
export const ImageSetSchema = z.object({
  sm: z.string().url(),
  md: z.string().url(),
  lg: z.string().url(),
  alt: z.string().default(""),
});

// NOTE: Profile no longer stores media. Avatar/background/cover/CV live in the
// MediaAsset table (upload-many-activate-one) and are resolved by app/lib/media.ts
// into {{ profile.avatar }} etc. Project images live on the Project (project.media).
// See docs/MEDIA.md for the full media organization.

// --- Usage pattern (in a server action / repository) ---
//
// WRITE:
//   const parsed = BioVariantsSchema.parse(input.bioVariants); // throws if bad
//   await db.profile.update({ data: { bioVariants: parsed }, where: { id } });
//
// READ:
//   const row = await db.profile.findFirstOrThrow();
//   const bio = BioVariantsSchema.parse(row.bioVariants); // now type-safe
//   // theme picks: compact -> bio.short, detailed -> bio.long
//
// This is what "validate JSONB both directions" means in CLAUDE.md.

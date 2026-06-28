// lib/repos/profile.ts — Profile data layer (singleton).
//
// This is the ONE place that touches the profile row, so JSONB validation lives
// here and every caller (admin actions now, public rendering later) goes through
// the same safe path. bioVariants is parsed by Zod on BOTH write and read — we
// never trust the JSONB column's contents unparsed (CLAUDE.md rule).

import { db } from "../db";
import {
  BioVariantsSchema,
  type ProfileInput,
  type BioVariants,
} from "../schemas/profile";

export type Profile = {
  id: string;
  name: string;
  headline: string;
  email: string | null;
  location: string | null;
  bioVariants: BioVariants;
  updatedAt: Date;
};

// Read the singleton profile. Returns null if none exists yet. Parses the JSONB
// on the way out, so callers get a typed, validated BioVariants — never raw JSON.
export async function getProfile(): Promise<Profile | null> {
  const row = await db.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    headline: row.headline,
    email: row.email,
    location: row.location,
    bioVariants: BioVariantsSchema.parse(row.bioVariants), // READ-side validation
    updatedAt: row.updatedAt,
  };
}

// Create-or-update the singleton profile. Input is already shape-validated by
// ProfileInputSchema in the action; here we re-parse the JSONB defensively
// before it hits the column (WRITE-side validation).
export async function upsertProfile(input: ProfileInput): Promise<Profile> {
  const bioVariants = BioVariantsSchema.parse(input.bioVariants); // WRITE-side

  const existing = await db.profile.findFirst();
  const data = {
    name: input.name,
    headline: input.headline,
    email: input.email,
    location: input.location,
    bioVariants,
  };

  const row = existing
    ? await db.profile.update({ where: { id: existing.id }, data })
    : await db.profile.create({ data });

  return {
    id: row.id,
    name: row.name,
    headline: row.headline,
    email: row.email,
    location: row.location,
    bioVariants: BioVariantsSchema.parse(row.bioVariants),
    updatedAt: row.updatedAt,
  };
}

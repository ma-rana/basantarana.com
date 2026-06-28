// lib/schemas/skill.ts — Zod validation for Skills.
// Flat relational fields only: no JSONB, no HTML, no slug. category is a real
// queryable column (you filter by it) but free-text, not a managed list.

import { z } from "zod";

export const SkillInputSchema = z.object({
  name: z.string().min(1, "Name is required.").max(80),
  category: z.string().min(1, "Category is required.").max(60),
  level: z
    .number({ error: "Level must be a number." })
    .int("Level must be a whole number.")
    .min(0, "Level can’t be below 0.")
    .max(100, "Level can’t be above 100."),
  order: z.number().int().min(0).max(100000).default(0),
});
export type SkillInput = z.infer<typeof SkillInputSchema>;

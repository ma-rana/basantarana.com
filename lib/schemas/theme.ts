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

// lib/schemas/auth.ts — Zod validation for auth inputs. Server-side validation
// is the real gate; client validation is only UX. An attacker posts raw bodies.

import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1024), // length checks only; never log this
});
export type LoginInput = z.infer<typeof LoginSchema>;

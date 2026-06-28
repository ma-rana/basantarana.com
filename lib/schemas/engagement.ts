// lib/schemas/engagement.ts — validation for engagement events.
//
// The DB stores type/targetType as strings (not enums), so we validate against
// string literals here. Two event kinds: "view" (no session) and "like"
// (carries an anonymous session id for idempotency).

import { z } from "zod";

export const EngagementType = z.enum(["view", "like"]);
export type EngagementType = z.infer<typeof EngagementType>;

export const TargetType = z.enum(["profile", "project"]);
export type TargetType = z.infer<typeof TargetType>;

// A like always targets a project and carries a session id.
export const LikeInputSchema = z.object({
  targetId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Invalid project slug."),
  sessionId: z.string().min(8).max(64),
});
export type LikeInput = z.infer<typeof LikeInputSchema>;

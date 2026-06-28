// lib/repos/engagement.ts — engagement data layer.
//
// Views are fire-and-forget (callers don't await; failures must never break a
// page render). Likes are idempotent per session via the unique index
// (type,targetType,targetId,sessionId): a duplicate throws P2002, which we
// swallow. Aggregates power the admin dashboard.

import { Prisma } from "../../app/generated/prisma/client";
import { db } from "../db";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Record a view. Never throws to the caller — a failed analytics write must not
// take down the page. Intended to be called WITHOUT await (fire-and-forget).
export async function recordView(
  targetType: "profile" | "project",
  targetId?: string,
): Promise<void> {
  try {
    await db.engagementEvent.create({
      data: { type: "view", targetType, targetId: targetId ?? null, sessionId: null },
    });
  } catch (e) {
    // Swallow — views are best-effort. Log for visibility.
    console.warn("[engagement] recordView failed:", e);
  }
}

// Record a like idempotently. Returns true if a NEW like was stored, false if
// this session had already liked this target (duplicate -> unique violation).
export async function recordLike(targetId: string, sessionId: string): Promise<boolean> {
  try {
    await db.engagementEvent.create({
      data: { type: "like", targetType: "project", targetId, sessionId },
    });
    return true;
  } catch (e) {
    if (isUniqueViolation(e)) return false; // already liked by this session
    console.warn("[engagement] recordLike failed:", e);
    return false;
  }
}

export async function getProjectLikeCount(targetId: string): Promise<number> {
  return db.engagementEvent.count({
    where: { type: "like", targetType: "project", targetId },
  });
}

// Map of slug -> like count, for all projects at once (one query).
export async function getLikeCountsBySlug(): Promise<Record<string, number>> {
  const rows = await db.engagementEvent.groupBy({
    by: ["targetId"],
    where: { type: "like", targetType: "project", targetId: { not: null } },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.targetId) out[r.targetId] = r._count._all;
  }
  return out;
}

export type EngagementStats = {
  profileViews: number;
  totalProjectViews: number;
  totalLikes: number;
  perProject: { targetId: string; views: number; likes: number }[];
};

export async function getEngagementStats(): Promise<EngagementStats> {
  const [profileViews, projectViewRows, likeRows] = await Promise.all([
    db.engagementEvent.count({ where: { type: "view", targetType: "profile" } }),
    db.engagementEvent.groupBy({
      by: ["targetId"],
      where: { type: "view", targetType: "project", targetId: { not: null } },
      _count: { _all: true },
    }),
    db.engagementEvent.groupBy({
      by: ["targetId"],
      where: { type: "like", targetType: "project", targetId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const views: Record<string, number> = {};
  for (const r of projectViewRows) if (r.targetId) views[r.targetId] = r._count._all;
  const likes: Record<string, number> = {};
  for (const r of likeRows) if (r.targetId) likes[r.targetId] = r._count._all;

  const slugs = Array.from(new Set([...Object.keys(views), ...Object.keys(likes)]));
  const perProject = slugs
    .map((targetId) => ({ targetId, views: views[targetId] ?? 0, likes: likes[targetId] ?? 0 }))
    .sort((a, b) => b.views - a.views);

  const totalProjectViews = Object.values(views).reduce((a, b) => a + b, 0);
  const totalLikes = Object.values(likes).reduce((a, b) => a + b, 0);

  return { profileViews, totalProjectViews, totalLikes, perProject };
}

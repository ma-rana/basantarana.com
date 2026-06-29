// lib/repos/platform-stat.ts — PlatformStat data layer.
// The DB enforces @@unique([platform, label]); we catch Prisma's P2002 and
// return a sentinel so the action can show a clean field error instead of a
// raw constraint crash.

import { Prisma } from "../../app/generated/prisma/client";
import { db } from "../db";
import type { PlatformStatInput } from "../schemas/platform-stat";

export type PlatformStat = {
  id: string;
  platform: string;
  label: string;
  value: number;
  order: number;
  apiUrl: string | null;
  apiPath: string | null;
  cachedValue: number | null;
  fetchedAt: Date | null;
};

// What a theme should DISPLAY for a stat: the live cached number when this stat
// is API-backed and has been fetched, otherwise the manual value. Never exposes
// apiUrl (which may hold a secret key).
export function statDisplayValue(s: PlatformStat): number {
  if (s.apiUrl && s.cachedValue != null) return s.cachedValue;
  return s.value;
}

export type DuplicateError = { kind: "duplicate" };

// The Zod input leaves apiUrl/apiPath as `undefined` when the form fields are
// blank. On UPDATE, Prisma treats `undefined` as "leave unchanged" — which would
// make it impossible to CLEAR an API URL once set. Coerce undefined -> null so a
// blanked field actually clears, reverting the stat to manual. Also clear the
// cache when the API config is removed, so a stale cached number can't linger.
function normalizeApiFields(input: PlatformStatInput) {
  const apiUrl = input.apiUrl ?? null;
  const apiPath = input.apiPath ?? null;
  const cleared = apiUrl == null || apiPath == null;
  return {
    ...input,
    apiUrl,
    apiPath,
    // If the stat is no longer API-backed, drop the cached value/timestamp.
    ...(cleared ? { cachedValue: null, fetchedAt: null } : {}),
  };
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function listPlatformStats(): Promise<PlatformStat[]> {
  return db.platformStat.findMany({
    orderBy: [{ order: "asc" }, { platform: "asc" }],
  });
}

export async function getPlatformStatById(id: string): Promise<PlatformStat | null> {
  return db.platformStat.findUnique({ where: { id } });
}

export async function createPlatformStat(
  input: PlatformStatInput,
): Promise<PlatformStat | DuplicateError> {
  try {
    return await db.platformStat.create({ data: normalizeApiFields(input) });
  } catch (e) {
    if (isUniqueViolation(e)) return { kind: "duplicate" };
    throw e;
  }
}

export async function updatePlatformStat(
  id: string,
  input: PlatformStatInput,
): Promise<PlatformStat | DuplicateError | null> {
  const existing = await db.platformStat.findUnique({ where: { id } });
  if (!existing) return null;
  try {
    return await db.platformStat.update({ where: { id }, data: normalizeApiFields(input) });
  } catch (e) {
    if (isUniqueViolation(e)) return { kind: "duplicate" };
    throw e;
  }
}

export async function deletePlatformStat(id: string): Promise<void> {
  await db.platformStat.delete({ where: { id } }).catch(() => {});
}

// ---- Live stats: fetch a number from an external API ----

// Walk a dot-path ("items.0.statistics.subscriberCount") into a parsed JSON
// value. Numeric segments index arrays. Returns undefined if the path misses.
function walkPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

// Coerce an API value to a non-negative integer. APIs often return counts as
// strings ("1234"); accept those. Returns null if it isn't a number.
function toCount(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export type RefreshResult = { id: string; ok: boolean; value?: number; error?: string };

// Fetch ONE stat's live value. On success, stores cachedValue + fetchedAt. On
// ANY failure (network, bad JSON, path miss, non-number), leaves the existing
// cache untouched so a transient error never wipes a good number. SERVER-ONLY:
// this is where apiUrl (possibly containing a key) is used; it never leaves here.
export async function refreshStat(id: string): Promise<RefreshResult> {
  const stat = await db.platformStat.findUnique({ where: { id } });
  if (!stat) return { id, ok: false, error: "not found" };
  if (!stat.apiUrl || !stat.apiPath) return { id, ok: false, error: "no api configured" };

  try {
    const res = await fetch(stat.apiUrl, {
      headers: { Accept: "application/json", "User-Agent": "portfolio-cms" },
      // Don't let a slow API hang the refresh forever.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { id, ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    const raw = walkPath(json, stat.apiPath);
    const count = toCount(raw);
    if (count == null) return { id, ok: false, error: "path did not resolve to a number" };

    await db.platformStat.update({
      where: { id },
      data: { cachedValue: count, fetchedAt: new Date() },
    });
    return { id, ok: true, value: count };
  } catch (e) {
    return { id, ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

// Refresh every API-backed stat (called by the scheduled job). Manual stats
// (no apiUrl) are skipped. Runs sequentially to stay gentle on rate limits.
export async function refreshAllStats(): Promise<RefreshResult[]> {
  const stats = await db.platformStat.findMany({
    where: { apiUrl: { not: null }, apiPath: { not: null } },
    select: { id: true },
  });
  const results: RefreshResult[] = [];
  for (const s of stats) results.push(await refreshStat(s.id));
  return results;
}

// Persist an explicit order from a drag-to-reorder. `orderedIds` is the full
// list of stat ids in their new top-to-bottom order; each row's `order` becomes
// its index. Only changed rows are written, in one transaction. Unknown ids are
// ignored.
export async function reorderPlatformStats(orderedIds: string[]): Promise<void> {
  const existing = await db.platformStat.findMany({ select: { id: true, order: true } });
  const currentOrder = new Map(existing.map((s) => [s.id, s.order]));

  const writes = orderedIds
    .filter((id) => currentOrder.has(id))
    .map((id, i) => ({ id, newOrder: i }))
    .filter((s) => currentOrder.get(s.id) !== s.newOrder)
    .map((s) => db.platformStat.update({ where: { id: s.id }, data: { order: s.newOrder } }));

  if (writes.length) await db.$transaction(writes);
}

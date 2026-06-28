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
};

export type DuplicateError = { kind: "duplicate" };

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
    return await db.platformStat.create({ data: input });
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
    return await db.platformStat.update({ where: { id }, data: input });
  } catch (e) {
    if (isUniqueViolation(e)) return { kind: "duplicate" };
    throw e;
  }
}

export async function deletePlatformStat(id: string): Promise<void> {
  await db.platformStat.delete({ where: { id } }).catch(() => {});
}

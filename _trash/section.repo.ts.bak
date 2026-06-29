// lib/repos/section.ts — Section data layer (home-page composition).
//
// The six section rows are seeded; we don't create/delete them here, only
// toggle enabled and reorder. listEnabledSections is the PUBLIC read (engine);
// listSections is the admin read (all, ordered).

import { db } from "../db";
import type { SectionType, SectionConfig } from "../schemas/section";

export type Section = {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  config: SectionConfig;
};

function toSection(row: {
  id: string; type: string; enabled: boolean; order: number; config: unknown;
}): Section {
  return {
    id: row.id,
    type: row.type as SectionType,
    enabled: row.enabled,
    order: row.order,
    config: (row.config as SectionConfig) ?? {},
  };
}

// Admin: every section, in display order.
export async function listSections(): Promise<Section[]> {
  const rows = await db.section.findMany({ orderBy: { order: "asc" } });
  return rows.map(toSection);
}

// Public: only enabled sections, in order (what the home page renders).
export async function listEnabledSections(): Promise<Section[]> {
  const rows = await db.section.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
  });
  return rows.map(toSection);
}

export async function setSectionEnabled(id: string, enabled: boolean): Promise<void> {
  await db.section.update({ where: { id }, data: { enabled } }).catch(() => {});
}

// Move a section one step up or down by swapping its `order` with the adjacent
// section. No-op if it's already at the boundary. Done in a transaction so the
// two rows never collide on order mid-swap.
export async function moveSection(id: string, direction: "up" | "down"): Promise<void> {
  const all = await db.section.findMany({ orderBy: { order: "asc" } });
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return; // at boundary; nothing to do

  const a = all[idx];
  const b = all[swapIdx];

  await db.$transaction([
    db.section.update({ where: { id: a.id }, data: { order: b.order } }),
    db.section.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
}

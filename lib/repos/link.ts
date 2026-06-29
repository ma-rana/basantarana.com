// lib/repos/link.ts — external links (LinkAsset) + theme placeholder resolution.
//
// Same "add-many, activate, slot" pattern as media (app/lib/media.ts), but a
// link is just a url + label (no stored file). Themes read:
//   {{ profile.link }} / {{ profile.link_label }}   canonical active
//   {{ profile.link1 }} / {{ profile.link1_label }}  numbered slots
//   {% for l in profile.links %}{{ l.url }} {{ l.label }}{% endfor %}  slot list

import { db } from "../db";

export type LinkAsset = {
  id: string;
  url: string;
  label: string;
  key: string | null;
  isActive: boolean;
  slotOrder: number | null;
  createdAt: Date;
};

// ---- Admin list / CRUD ----

export async function listLinks(): Promise<LinkAsset[]> {
  return db.linkAsset.findMany({
    orderBy: [{ isActive: "desc" }, { slotOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function createLink(
  url: string,
  label: string,
  key?: string | null,
): Promise<LinkAsset> {
  return db.linkAsset.create({
    data: { url, label, key: key ?? null, isActive: false },
  });
}

export async function deleteLink(id: string): Promise<void> {
  await db.linkAsset.delete({ where: { id } }).catch(() => {});
}

// Activate / deactivate — multiple links can be active at once (like media).
export async function activateLink(id: string): Promise<void> {
  await db.linkAsset.update({ where: { id }, data: { isActive: true } });
}
export async function deactivateLink(id: string): Promise<void> {
  await db.linkAsset.update({ where: { id }, data: { isActive: false } });
}

// Assign to the next free slot number; no-op if already slotted.
export async function addLinkToNextSlot(id: string): Promise<number> {
  const item = await db.linkAsset.findUniqueOrThrow({ where: { id } });
  if (item.slotOrder != null) return item.slotOrder;
  const highest = await db.linkAsset.findFirst({
    where: { slotOrder: { not: null } },
    orderBy: { slotOrder: "desc" },
  });
  const next = (highest?.slotOrder ?? 0) + 1;
  await db.linkAsset.update({ where: { id }, data: { slotOrder: next } });
  return next;
}

export async function removeLinkFromSlot(id: string): Promise<void> {
  await db.linkAsset.update({ where: { id }, data: { slotOrder: null } });
}

// ---- Theme placeholder resolution ----

// What the engine merges into `profile` for themes. Canonical active link, its
// label, each numbered slot (+ label), and the full slotted list as objects.
export type ActiveLinks = {
  link: string | null;
  link_label: string | null;
  links: { url: string; label: string }[];
  [key: string]: string | null | { url: string; label: string }[];
};

export async function getActiveLinks(): Promise<ActiveLinks> {
  const rows = await db.linkAsset.findMany({
    where: { OR: [{ isActive: true }, { slotOrder: { not: null } }, { key: { not: null } }] },
    orderBy: { createdAt: "desc" },
  });

  // Canonical: most recently created active link wins for {{ profile.link }}.
  const activeCanonical = rows.find((r) => r.isActive) ?? null;

  const out: ActiveLinks = {
    link: activeCanonical ? activeCanonical.url : null,
    link_label: activeCanonical ? activeCanonical.label : null,
    links: [],
  };

  // Named keys: {{ profile.link_<key> }} (+ _label). rows are newest-first, so
  // when two links share a key we set the placeholder only the FIRST time we see
  // it — i.e. the newest wins (matching the chosen collision rule).
  const seenKeys = new Set<string>();
  for (const r of rows) {
    if (!r.key || seenKeys.has(r.key)) continue;
    seenKeys.add(r.key);
    out[`link_${r.key}`] = r.url;
    out[`link_${r.key}_label`] = r.label;
  }

  // Numbered slots, ordered by slotOrder ascending.
  const slotted = rows
    .filter((r) => r.slotOrder != null)
    .sort((a, b) => (a.slotOrder ?? 0) - (b.slotOrder ?? 0));

  const list: { url: string; label: string }[] = [];
  for (const r of slotted) {
    out[`link${r.slotOrder}`] = r.url;
    out[`link${r.slotOrder}_label`] = r.label;
    list.push({ url: r.url, label: r.label });
  }
  out.links = list;

  return out;
}

// app/lib/media.ts
//
// Resolves the ACTIVE and SLOTTED media into values themes can use.
//
// TWO parallel systems:
//
// 1. Single-active (existing, unchanged):
//    One asset per type is "active". Themes reference:
//    {{ profile.avatar }}, {{ profile.background }}, {{ profile.cover }},
//    {{ profile.cv }}, {{ profile.video_background }}
//
// 2. Named slots (new):
//    Any asset can be assigned a slotOrder (1, 2, 3 …) within its type.
//    The engine builds numbered keys and lists so themes can reference:
//    {{ profile.image1 }}, {{ profile.image2 }}, …  (AVATAR slots)
//    {{ profile.cover1 }}, {{ profile.cover2 }}, …  (COVER slots)
//    {{ profile.background1 }}, …                   (BACKGROUND slots)
//    {{ profile.video1 }}, {{ profile.video2 }}, …  (VIDEO_BACKGROUND slots)
//    {% for img in profile.images %}…{% endfor %}   (all AVATAR slots as list)
//    {% for c in profile.covers %}…{% endfor %}
//    {% for b in profile.backgrounds %}…{% endfor %}
//    {% for v in profile.videos %}…{% endfor %}
//
// The two systems are independent. An asset can be active AND slotted, or
// just one, or neither (sitting in the library unused).

import { db } from "../../lib/db";

// Slot-type config: which MediaType maps to which prefix.
const SLOT_TYPES = [
  { type: "AVATAR",           prefix: "image",      listKey: "images"      },
  { type: "COVER",            prefix: "cover",       listKey: "covers"      },
  { type: "BACKGROUND",       prefix: "background",  listKey: "backgrounds" },
  { type: "VIDEO_BACKGROUND", prefix: "video",       listKey: "videos"      },
] as const;

export type ActiveMedia = {
  // Single-active placeholders (unchanged)
  avatar:           string | null;
  background:       string | null;
  cover:            string | null;
  cv:               string | null;
  video_background: string | null;
  // Numbered slot placeholders (image1, image2, cover1, video2, etc.)
  // and list versions (images, covers, backgrounds, videos).
  // Typed as Record so the engine can spread them into the profile object.
  [key: string]: string | string[] | null;
};

function urlWithVersion(url: string, version: number) {
  return `${url}?v=${version}`;
}

export async function getActiveMedia(): Promise<ActiveMedia> {
  // Load all assets that are either active or slotted (or both).
  const assets = await db.mediaAsset.findMany({
    where: { OR: [{ isActive: true }, { slotOrder: { not: null } }] },
    orderBy: { slotOrder: "asc" },
  });

  // ── Single-active (existing behaviour) ──────────────────────────────────
  const pick = (type: string): string | null => {
    const m = assets.find((a) => a.type === type && a.isActive);
    return m ? urlWithVersion(m.url, m.version) : null;
  };

  // ── Named slots ──────────────────────────────────────────────────────────
  // For each slot type, collect slotted assets sorted by slotOrder, build
  // image1/image2/… keys and the images[] list.
  const slotData: Record<string, string | string[] | null> = {};

  for (const { type, prefix, listKey } of SLOT_TYPES) {
    const slotted = assets
      .filter((a) => a.type === type && a.slotOrder != null)
      .sort((a, b) => (a.slotOrder ?? 0) - (b.slotOrder ?? 0));

    const list: string[] = [];
    for (const asset of slotted) {
      const url = urlWithVersion(asset.url, asset.version);
      slotData[`${prefix}${asset.slotOrder}`] = url; // e.g. image1, cover2
      list.push(url);
    }
    slotData[listKey] = list; // e.g. images: ["…", "…"]
  }

  return {
    // Single-active
    avatar:           pick("AVATAR"),
    background:       pick("BACKGROUND"),
    cover:            pick("COVER"),
    cv:               pick("CV"),
    video_background: pick("VIDEO_BACKGROUND"),
    // Named slots + lists
    ...slotData,
  };
}

// Activating one media item deactivates the others of the SAME type.
// The version is bumped by the admin action after calling this.
export async function setActiveMedia(id: string) {
  const item = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.mediaAsset.updateMany({
      where: { type: item.type, isActive: true },
      data:  { isActive: false },
    }),
    db.mediaAsset.update({ where: { id }, data: { isActive: true } }),
  ]);
}

// Assign this asset to the next free slot number for its type.
// If it already has a slot, it stays where it is (idempotent).
// Returns the assigned slotOrder.
export async function addToNextSlot(id: string): Promise<number> {
  const item = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  if (item.slotOrder != null) return item.slotOrder; // already slotted

  // Find the highest existing slotOrder for this type.
  const highest = await db.mediaAsset.findFirst({
    where:   { type: item.type, slotOrder: { not: null } },
    orderBy: { slotOrder: "desc" },
  });
  const next = (highest?.slotOrder ?? 0) + 1;

  await db.mediaAsset.update({ where: { id }, data: { slotOrder: next } });
  return next;
}

// Remove this asset from its slot (set slotOrder to null).
// Does not compact the remaining slots — gaps are fine, order is preserved.
export async function removeFromSlot(id: string): Promise<void> {
  await db.mediaAsset.update({ where: { id }, data: { slotOrder: null } });
}

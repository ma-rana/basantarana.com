// app/lib/media.ts
//
// Resolves the ACTIVE and SLOTTED media into values themes can use.
//
// TWO parallel systems:
//
// 1. Single-active (canonical):
//    Any asset can be marked active. For the single-value placeholders
//    ({{ profile.avatar }} etc.) the engine picks the most recently activated
//    per type (highest version), so existing themes always see exactly one value.
//    Multiple can be active simultaneously — use the slot system to reference
//    them individually.
//
// 2. Named slots:
//    Any asset can be assigned a slotOrder (1, 2, 3 …) within its type.
//    {{ profile.image1 }}, {{ profile.image2 }}, … (AVATAR slots)
//    {{ profile.cover1 }}, {{ profile.cover2 }}, … (COVER slots)
//    {{ profile.background1 }}, …                  (BACKGROUND slots)
//    {{ profile.video1 }}, {{ profile.video2 }}, … (VIDEO_BACKGROUND slots)
//    {{ profile.document1 }}, {{ profile.document2 }}, … (CV / document slots)
//    {% for img in profile.images %}…{% endfor %}  (all AVATAR slots as list)
//    {% for c   in profile.covers %}…{% endfor %}
//    {% for b   in profile.backgrounds %}…{% endfor %}
//    {% for v   in profile.videos %}…{% endfor %}
//    {% for d   in profile.documents %}…{% endfor %}

import { db } from "../../lib/db";

const SLOT_TYPES = [
  { type: "AVATAR",           prefix: "image",      listKey: "images"      },
  { type: "COVER",            prefix: "cover",       listKey: "covers"      },
  { type: "BACKGROUND",       prefix: "background",  listKey: "backgrounds" },
  { type: "VIDEO_BACKGROUND", prefix: "video",       listKey: "videos"      },
  { type: "CV",               prefix: "document",    listKey: "documents"   },
] as const;

export type ActiveMedia = {
  avatar:           string | null;
  background:       string | null;
  cover:            string | null;
  cv:               string | null;
  video_background: string | null;
  favicon:          string | null;
  [key: string]: string | string[] | null;
};

function urlWithVersion(url: string, version: number) {
  return `${url}?v=${version}`;
}

export async function getActiveMedia(): Promise<ActiveMedia> {
  const assets = await db.mediaAsset.findMany({
    where: { OR: [{ isActive: true }, { slotOrder: { not: null } }] },
    orderBy: { version: "desc" }, // highest version first = most recently activated
  });

  // Single-value canonical placeholder: highest-version active of each type.
  // If multiple assets of the same type are active, the one with the highest
  // version (most recently activated) wins for {{ profile.avatar }} etc.
  const pickCanonical = (type: string): string | null => {
    const m = assets.find((a) => a.type === type && a.isActive);
    return m ? urlWithVersion(m.url, m.version) : null;
  };

  // Named slots — ordered by slotOrder ascending.
  const slotData: Record<string, string | string[] | null> = {};
  for (const { type, prefix, listKey } of SLOT_TYPES) {
    const slotted = assets
      .filter((a) => a.type === type && a.slotOrder != null)
      .sort((a, b) => (a.slotOrder ?? 0) - (b.slotOrder ?? 0));

    const list: string[] = [];
    for (const asset of slotted) {
      const url = urlWithVersion(asset.url, asset.version);
      slotData[`${prefix}${asset.slotOrder}`] = url;
      list.push(url);
    }
    slotData[listKey] = list;
  }

  return {
    avatar:           pickCanonical("AVATAR"),
    background:       pickCanonical("BACKGROUND"),
    cover:            pickCanonical("COVER"),
    cv:               pickCanonical("CV"),
    video_background: pickCanonical("VIDEO_BACKGROUND"),
    favicon:          pickCanonical("FAVICON"),
    ...slotData,
  };
}

// Activate one asset (does NOT deactivate others — multiple can be active).
// Bumps version so the URL cache-busts after activation.
export async function activateMedia(id: string): Promise<void> {
  await db.mediaAsset.update({
    where: { id },
    data:  { isActive: true, version: { increment: 1 } },
  });
}

// Deactivate one asset only.
export async function deactivateMedia(id: string): Promise<void> {
  await db.mediaAsset.update({
    where: { id },
    data:  { isActive: false },
  });
}

// Keep setActiveMedia for any code still referencing it — now just delegates.
export async function setActiveMedia(id: string): Promise<void> {
  await activateMedia(id);
}

// Assign this asset to the next free slot number for its type.
export async function addToNextSlot(id: string): Promise<number> {
  const item = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  if (item.slotOrder != null) return item.slotOrder;

  const highest = await db.mediaAsset.findFirst({
    where:   { type: item.type, slotOrder: { not: null } },
    orderBy: { slotOrder: "desc" },
  });
  const next = (highest?.slotOrder ?? 0) + 1;
  await db.mediaAsset.update({ where: { id }, data: { slotOrder: next } });
  return next;
}

// Remove this asset from its slot (back to library-only).
export async function removeFromSlot(id: string): Promise<void> {
  await db.mediaAsset.update({ where: { id }, data: { slotOrder: null } });
}

// app/lib/media.ts
//
// Resolves the ACTIVE media of each type into the values themes reference as
// {{ profile.avatar }}, {{ profile.background }}, {{ profile.cover }}, {{ profile.cv }}.
//
// The library can hold many of each type; exactly one per type is active.
// The version number is appended (?v=N) so browsers fetch the new file after
// you activate a different one (cache-busting).

import { db } from "../../lib/db";

export type ActiveMedia = {
  avatar: string | null;
  background: string | null;
  cover: string | null;
  cv: string | null;
};

// Returns the active file URL per type, or null if none active.
// NOTE: null (not "") matters — in Liquid an empty string is TRUTHY, so an
// unset image with {% if profile.cover %} would render a broken empty src.
// null is correctly falsy, so {% if %} hides it as intended.
export async function getActiveMedia(): Promise<ActiveMedia> {
  const active = await db.mediaAsset.findMany({ where: { isActive: true } });

  const pick = (type: string): string | null => {
    const m = active.find((a) => a.type === type);
    return m ? `${m.url}?v=${m.version}` : null;
  };

  return {
    avatar: pick("AVATAR"),
    background: pick("BACKGROUND"),
    cover: pick("COVER"),
    cv: pick("CV"),
  };
}

// Activating one media item deactivates the others of the SAME type, so there's
// always exactly one active per type. Call from the admin "set active" action.
export async function setActiveMedia(id: string) {
  const item = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.mediaAsset.updateMany({
      where: { type: item.type, isActive: true },
      data: { isActive: false },
    }),
    db.mediaAsset.update({ where: { id }, data: { isActive: true } }),
  ]);
}

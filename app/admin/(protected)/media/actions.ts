"use server";

// app/admin/(protected)/media/actions.ts
// Admin actions for media asset management. All call requireAdmin() first.
// Upload is handled by the route handler (app/api/media/upload/route.ts) —
// these actions handle activate + delete only.

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";
import { setActiveMedia } from "../../../lib/media";

export async function activateMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await setActiveMedia(id);
  // Bump the version so themes get a fresh URL (?v=N) and browsers don't serve
  // the previously-cached asset after switching. setActiveMedia doesn't do this.
  await db.mediaAsset.update({ where: { id }, data: { version: { increment: 1 } } });
  revalidatePath("/admin/media");
  revalidatePath("/"); // engine reads active media on every render
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;

  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;

  // Remove the physical file from /public/uploads/ — best-effort (don't fail if
  // it's already gone, e.g. a seed asset without a real file).
  const filePath = path.join(process.cwd(), "public", asset.url);
  await fs.rm(filePath, { force: true }).catch(() => {});

  await db.mediaAsset.delete({ where: { id } });
  revalidatePath("/admin/media");
  revalidatePath("/");
}

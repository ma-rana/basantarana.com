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
import { setActiveMedia, activateMedia, deactivateMedia, addToNextSlot, removeFromSlot } from "../../../lib/media";

export async function activateMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  // activateMedia bumps version (cache-bust) and sets isActive: true.
  // Does NOT deactivate others — multiple can be active simultaneously.
  await activateMedia(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

export async function deactivateMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await deactivateMedia(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
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

// Add this asset to the next available slot for its type.
// If it's already slotted, this is a no-op.
export async function addToSlotAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await addToNextSlot(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

// Remove this asset from its slot (back to library-only).
export async function removeFromSlotAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await removeFromSlot(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

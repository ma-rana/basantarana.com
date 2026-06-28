"use server";

// app/admin/(protected)/themes/actions.ts — activate a theme.
// requireAdmin() first. Sets the chosen Theme.isActive = true and clears the
// rest, so exactly one theme is active (the engine reads it).

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";

export async function activateThemeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = formData.get("key") as string;
  if (!key) return;

  const theme = await db.theme.findUnique({ where: { key } });
  if (!theme) return;

  await db.$transaction([
    db.theme.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    db.theme.update({ where: { key }, data: { isActive: true } }),
  ]);

  revalidatePath("/admin/themes");
}

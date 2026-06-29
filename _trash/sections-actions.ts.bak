"use server";

// app/admin/(protected)/sections/actions.ts — toggle + reorder home sections.
// requireAdmin() first. These change how the public home page is composed.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { setSectionEnabled, moveSection } from "../../../../lib/repos/section";

function revalidate() {
  revalidatePath("/admin/sections");
  revalidatePath("/"); // public home composition changed
}

export async function toggleSectionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id") as string;
  const enabled = formData.get("enabled") === "true"; // desired new state
  if (id) await setSectionEnabled(id, enabled);
  revalidate();
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";
  if (id && (direction === "up" || direction === "down")) {
    await moveSection(id, direction);
  }
  revalidate();
}

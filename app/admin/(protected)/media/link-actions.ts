"use server";

// app/admin/(protected)/media/link-actions.ts
// Admin actions for external links (LinkAsset), shown as the Links tab in the
// Media manager. Same activate/slot/delete pattern as media, plus an add action
// (links are typed in, not uploaded). All call requireAdmin() first.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { LinkInputSchema } from "../../../../lib/schemas/link";
import {
  createLink,
  deleteLink,
  activateLink,
  deactivateLink,
  addLinkToNextSlot,
  removeLinkFromSlot,
} from "../../../../lib/repos/link";

export type AddLinkState = { ok: boolean; error: string | null };

export async function addLinkAction(
  _prev: AddLinkState,
  formData: FormData,
): Promise<AddLinkState> {
  await requireAdmin();
  const parsed = LinkInputSchema.safeParse({
    url: (formData.get("url") as string) || "",
    label: (formData.get("label") as string) || "",
    key: (formData.get("key") as string) || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid link." };
  }
  await createLink(parsed.data.url, parsed.data.label, parsed.data.key ?? null);
  revalidatePath("/admin/media");
  revalidatePath("/");
  return { ok: true, error: null };
}

export async function activateLinkAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await activateLink(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

export async function deactivateLinkAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await deactivateLink(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await deleteLink(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

export async function addLinkToSlotAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await addLinkToNextSlot(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

export async function removeLinkFromSlotAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  await removeLinkFromSlot(id);
  revalidatePath("/admin/media");
  revalidatePath("/");
}

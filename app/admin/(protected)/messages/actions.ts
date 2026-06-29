"use server";

// app/admin/(protected)/messages/actions.ts — inbox actions (read/unread/delete).
// All require admin. These mutate the contact-message inbox.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { setMessageRead, deleteMessage } from "../../../../lib/repos/contact";

export async function markReadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  const read = (formData.get("read") as string) === "true";
  if (id) await setMessageRead(id, read);
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = (formData.get("id") as string) || "";
  if (id) await deleteMessage(id);
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

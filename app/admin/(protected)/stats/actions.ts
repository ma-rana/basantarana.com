"use server";

// app/admin/(protected)/stats/actions.ts — PlatformStat CRUD server actions.
// requireAdmin() first; Zod re-validates server-side. Handles the
// platform+label uniqueness clash with a clean field error.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { PlatformStatInputSchema } from "../../../../lib/schemas/platform-stat";
import {
  createPlatformStat,
  updatePlatformStat,
  deletePlatformStat,
  reorderPlatformStats,
} from "../../../../lib/repos/platform-stat";

export type StatFormState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
};

const DUP_MSG = "A stat with this platform and label already exists.";

function parseForm(formData: FormData) {
  return PlatformStatInputSchema.safeParse({
    platform: ((formData.get("platform") as string) || "").trim(),
    label: ((formData.get("label") as string) || "").trim(),
    value: Number(formData.get("value") ?? 0),
    order: Number(formData.get("order") ?? 0),
  });
}

function collectFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createStatAction(
  _prev: StatFormState,
  formData: FormData,
): Promise<StatFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const result = await createPlatformStat(parsed.data);
  if ("kind" in result && result.kind === "duplicate") {
    return { ok: false, error: null, fieldErrors: { label: DUP_MSG } };
  }
  revalidatePath("/admin/stats");
  redirect("/admin/stats");
}

export async function updateStatAction(
  id: string,
  _prev: StatFormState,
  formData: FormData,
): Promise<StatFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const result = await updatePlatformStat(id, parsed.data);
  if (result === null) return { ok: false, error: "That stat no longer exists." };
  if ("kind" in result && result.kind === "duplicate") {
    return { ok: false, error: null, fieldErrors: { label: DUP_MSG } };
  }
  revalidatePath("/admin/stats");
  revalidatePath(`/admin/stats/${id}`);
  return { ok: true, error: null };
}

export async function deleteStatAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (id) await deletePlatformStat(id);
  revalidatePath("/admin/stats");
  redirect("/admin/stats");
}

// Reorder from a drag-to-reorder. The client drag-list calls this directly with
// the full ordered id list.
export async function reorderStatsAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();
  if (!Array.isArray(orderedIds)) return;
  await reorderPlatformStats(orderedIds.filter((id) => typeof id === "string"));
  revalidatePath("/admin/stats");
  revalidatePath("/");
}

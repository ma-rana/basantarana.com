"use server";

// app/admin/(protected)/skills/actions.ts — Skills CRUD server actions.
// requireAdmin() first; Zod re-validates server-side. Flat fields, no JSONB/HTML.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { SkillInputSchema } from "../../../../lib/schemas/skill";
import { createSkill, updateSkill, deleteSkill, reorderSkills } from "../../../../lib/repos/skill";

export type SkillFormState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return SkillInputSchema.safeParse({
    name: ((formData.get("name") as string) || "").trim(),
    category: ((formData.get("category") as string) || "").trim(),
    level: Number(formData.get("level") ?? 0),
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

export async function createSkillAction(
  _prev: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  await createSkill(parsed.data);
  revalidatePath("/admin/skills");
  redirect("/admin/skills");
}

export async function updateSkillAction(
  id: string,
  _prev: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const result = await updateSkill(id, parsed.data);
  if (result === null) return { ok: false, error: "That skill no longer exists." };
  revalidatePath("/admin/skills");
  revalidatePath(`/admin/skills/${id}`);
  return { ok: true, error: null };
}

export async function deleteSkillAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (id) await deleteSkill(id);
  revalidatePath("/admin/skills");
  redirect("/admin/skills");
}

// Reorder from a drag-to-reorder, scoped to one category. The client drag-list
// calls this directly with the category and its new ordered id list.
export async function reorderSkillsAction(category: string, orderedIds: string[]): Promise<void> {
  await requireAdmin();
  if (typeof category !== "string" || !Array.isArray(orderedIds)) return;
  await reorderSkills(category, orderedIds.filter((id) => typeof id === "string"));
  revalidatePath("/admin/skills");
  revalidatePath("/");
}

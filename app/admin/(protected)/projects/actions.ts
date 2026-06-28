"use server";

// app/admin/(protected)/projects/actions.ts — Projects CRUD server actions.
// Every action: requireAdmin() first, Zod-validate server-side, repo sanitizes
// + validates JSONB. Content blocks arrive as a JSON string in `content` (the
// client block editor serializes them) and are parsed + validated here.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { ProjectInputSchema } from "../../../../lib/schemas/project";
import {
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
} from "../../../../lib/repos/project";

export type ProjectFormState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  // content + tags come in as JSON strings from the client editor.
  let content: unknown = [];
  let tags: unknown = [];
  try {
    content = JSON.parse((formData.get("content") as string) || "[]");
  } catch {
    content = null; // will fail Zod with a clear shape error
  }
  try {
    tags = JSON.parse((formData.get("tags") as string) || "[]");
  } catch {
    tags = null;
  }

  return ProjectInputSchema.safeParse({
    slug: ((formData.get("slug") as string) || "").trim(),
    title: ((formData.get("title") as string) || "").trim(),
    summary: ((formData.get("summary") as string) || "").trim(),
    status: formData.get("status") || "DRAFT",
    featured: formData.get("featured") === "on" || formData.get("featured") === "true",
    order: Number(formData.get("order") ?? 0),
    tags,
    content,
  });
}

function collectFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const result = await createProject(parsed.data);
  if ("kind" in result && result.kind === "slug_taken") {
    return { ok: false, error: null, fieldErrors: { slug: "That slug is already in use." } };
  }

  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const result = await updateProject(id, parsed.data);
  if (result === null) {
    return { ok: false, error: "That project no longer exists." };
  }
  if ("kind" in result && result.kind === "slug_taken") {
    return { ok: false, error: null, fieldErrors: { slug: "That slug is already in use." } };
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  return { ok: true, error: null };
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (id) await deleteProject(id);
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

// Reorder from a drag-to-reorder. Receives the full ordered id list directly
// (the client drag-list calls this, not a form post). No redirect — revalidate
// so the list re-renders; public ordering changes too (order asc), so / too.
export async function reorderProjectsAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();
  if (!Array.isArray(orderedIds)) return;
  await reorderProjects(orderedIds.filter((id) => typeof id === "string"));
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

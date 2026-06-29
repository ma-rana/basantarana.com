"use server";

// app/admin/(protected)/themes/actions.ts — theme switching + uploaded-theme
// management. requireAdmin() first on every action.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";
import { CreateThemeSchema, ExpectedFilesSchema } from "../../../../lib/schemas/theme";
import {
  isAllowedUploadName,
  isImageFile,
  ALLOWED_UPLOAD_HINT,
} from "../../../../lib/themes/paths";
import {
  createUploadedTheme,
  saveThemeFile,
  deleteUploadedTheme,
  deleteThemeFile,
  getThemeByKey,
  getThemeFileStatus,
  saveExpectedFiles,
} from "../../../../lib/repos/theme";

export async function activateThemeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = formData.get("key") as string;
  if (!key) return;

  const theme = await db.theme.findUnique({ where: { key } });
  if (!theme) return;

  // home.html is required to activate. Built-in themes always have it; for
  // uploaded themes, verify before activating (defense in depth behind the UI).
  if (theme.source === "uploaded") {
    const status = await getThemeFileStatus(key, "uploaded");
    if (!status["home.html"]) return; // refuse: no home.html
  }

  await db.$transaction([
    db.theme.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    db.theme.update({ where: { key }, data: { isActive: true } }),
  ]);

  revalidatePath("/admin/themes");
  revalidatePath("/");
}

export type CreateThemeState = { error: string | null };

export async function createThemeAction(
  _prev: CreateThemeState,
  formData: FormData,
): Promise<CreateThemeState> {
  await requireAdmin();
  const parsed = CreateThemeSchema.safeParse({
    key: ((formData.get("key") as string) || "").trim().toLowerCase(),
    name: ((formData.get("name") as string) || "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await createUploadedTheme(parsed.data.key, parsed.data.name);
  if ("kind" in result) {
    if (result.kind === "key_taken") return { error: "That theme key is already in use." };
    return { error: "Invalid theme key." };
  }

  revalidatePath("/admin/themes");
  redirect(`/admin/themes/${parsed.data.key}`);
}

export type UploadFilesState = {
  saved: string[];
  rejected: { name: string; reason: string }[];
  error: string | null;
};

// Multi-file upload. The admin picks one or more files; each is routed by its
// FILENAME: the six named files keep fixed roles, image files are stored as
// decoration. Unrecognized names are rejected with guidance. Each .html is
// Liquid-validated; images are written as bytes; everything is size-guarded and
// traversal-checked (via saveThemeFile -> themeFilePath).
export async function uploadThemeFilesAction(
  _prev: UploadFilesState,
  formData: FormData,
): Promise<UploadFilesState> {
  await requireAdmin();
  const key = (formData.get("key") as string) || "";

  const theme = await getThemeByKey(key);
  if (!theme) return { saved: [], rejected: [], error: "Theme not found." };
  if (theme.source !== "uploaded") {
    return { saved: [], rejected: [], error: "Built-in themes can't be edited." };
  }

  const uploads = formData.getAll("uploads").filter((u): u is File => u instanceof File && u.size > 0);
  if (uploads.length === 0) {
    return { saved: [], rejected: [], error: "Choose one or more files to upload." };
  }

  const saved: string[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const upload of uploads) {
    const name = upload.name;

    if (!isAllowedUploadName(name)) {
      rejected.push({ name, reason: `Unrecognized filename. Allowed: ${ALLOWED_UPLOAD_HINT}.` });
      continue;
    }
    // Size guard: theme text files are small; images a bit larger. 2 MB cap.
    if (upload.size > 2 * 1024 * 1024) {
      rejected.push({ name, reason: "File too large (max 2 MB)." });
      continue;
    }

    // Images -> bytes; html/css -> text. saveThemeFile handles the branch and
    // re-validates the name (traversal-safe) before writing.
    const contents: string | Uint8Array = isImageFile(name)
      ? new Uint8Array(await upload.arrayBuffer())
      : await upload.text();

    const result = await saveThemeFile(key, "uploaded", name, contents);
    if (result.ok) {
      saved.push(name);
    } else {
      rejected.push({ name, reason: result.error });
    }
  }

  revalidatePath(`/admin/themes/${key}`);
  revalidatePath("/");
  return { saved, rejected, error: null };
}

export async function deleteThemeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = (formData.get("key") as string) || "";
  const theme = await getThemeByKey(key);
  if (!theme || theme.source !== "uploaded") {
    // Built-in themes (or missing) — nothing to delete.
    revalidatePath("/admin/themes");
    return;
  }
  // If we're deleting the active theme, clear active first (engine falls back).
  if (theme.isActive) {
    await db.theme.update({ where: { key }, data: { isActive: false } }).catch(() => {});
  }
  await deleteUploadedTheme(key);
  revalidatePath("/admin/themes");
  revalidatePath("/");
  redirect("/admin/themes");
}

export async function deleteThemeFileAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = (formData.get("key") as string) || "";
  const filename = (formData.get("filename") as string) || "";
  const theme = await getThemeByKey(key);
  if (!theme || theme.source !== "uploaded") return;
  await deleteThemeFile(key, filename);
  revalidatePath(`/admin/themes/${key}`);
  revalidatePath("/");
}

export type ExpectedFilesState = { ok: boolean; error: string | null };

// Save the author-defined "expected files" checklist for an uploaded theme. The
// client posts the list as JSON under "expected". We validate the shape with
// Zod, drop blank rows, de-duplicate by filename (last label wins), and persist.
// This list is a planning/tracking aid: it changes only what the Files panel
// shows, never how the theme renders (the engine still reads its fixed files).
export async function saveExpectedFilesAction(
  _prev: ExpectedFilesState,
  formData: FormData,
): Promise<ExpectedFilesState> {
  await requireAdmin();
  const key = (formData.get("key") as string) || "";

  const theme = await getThemeByKey(key);
  if (!theme) return { ok: false, error: "Theme not found." };
  if (theme.source !== "uploaded") {
    return { ok: false, error: "Built-in themes can't be edited." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse((formData.get("expected") as string) || "[]");
  } catch {
    return { ok: false, error: "Could not read the checklist." };
  }

  const parsed = ExpectedFilesSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid checklist." };
  }

  // De-duplicate by filename (case-insensitive), keeping the last occurrence so
  // an edited label wins. Preserves input order otherwise.
  const byName = new Map<string, { name: string; label: string }>();
  for (const entry of parsed.data) {
    byName.set(entry.name.toLowerCase(), entry);
  }
  const cleaned = [...byName.values()];

  const result = await saveExpectedFiles(key, cleaned);
  if (!result.ok) return { ok: false, error: result.error ?? "Could not save." };

  revalidatePath(`/admin/themes/${key}`);
  return { ok: true, error: null };
}

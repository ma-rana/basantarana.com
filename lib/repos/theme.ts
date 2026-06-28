// lib/repos/theme.ts — theme records + uploaded-theme file storage.
//
// Built-in themes live in the repo (themes/<key>/) and are seeded as DB rows
// with source="builtin". Uploaded themes get a DB row (source="uploaded") plus
// files written under THEME_UPLOAD_DIR/<key>/. This repo manages both the rows
// and the uploaded files; the engine reads files via lib/themes/paths.

import { promises as fs } from "node:fs";
import { Liquid } from "liquidjs";
import { db } from "../db";
import {
  themeDir,
  themeFilePath,
  isValidThemeKey,
  isImageFile,
  THEME_FILES,
  type ThemeSource,
  type ThemeFile,
} from "../themes/paths";

const liquid = new Liquid({ strictVariables: false, strictFilters: false });

export type Theme = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  source: ThemeSource;
};

function toTheme(row: { id: string; key: string; name: string; isActive: boolean; source: string }): Theme {
  return { ...row, source: row.source === "uploaded" ? "uploaded" : "builtin" };
}

export async function listThemes(): Promise<Theme[]> {
  const rows = await db.theme.findMany({ orderBy: { name: "asc" } });
  return rows.map(toTheme);
}

export async function getThemeByKey(key: string): Promise<Theme | null> {
  const row = await db.theme.findUnique({ where: { key } });
  return row ? toTheme(row) : null;
}

export type CreateThemeResult = Theme | { kind: "key_taken" } | { kind: "invalid_key" };

// Create an UPLOADED theme: a DB row + an empty storage dir for its files.
export async function createUploadedTheme(key: string, name: string): Promise<CreateThemeResult> {
  if (!isValidThemeKey(key)) return { kind: "invalid_key" };
  const existing = await db.theme.findUnique({ where: { key } });
  if (existing) return { kind: "key_taken" };

  await fs.mkdir(themeDir(key, "uploaded"), { recursive: true });
  const row = await db.theme.create({
    data: { key, name, isActive: false, source: "uploaded" },
  });
  return toTheme(row);
}

// Which of a theme's files exist on disk (so the admin can see what's missing).
export async function getThemeFileStatus(
  key: string,
  source: ThemeSource,
): Promise<Record<ThemeFile, boolean>> {
  const status = {} as Record<ThemeFile, boolean>;
  await Promise.all(
    THEME_FILES.map(async (file) => {
      try {
        await fs.access(themeFilePath(key, source, file));
        status[file] = true;
      } catch {
        status[file] = false;
      }
    }),
  );
  return status;
}

export type SaveFileResult = { ok: true } | { ok: false; error: string };

// Validate + write one uploaded theme file. HTML files must parse as Liquid so a
// malformed upload can't 500 the public site later. Images are written as raw
// bytes (no Liquid check). Only uploaded themes are writable (built-in files
// ship read-only with the repo). `contents` is text for html/css, bytes for
// images.
export async function saveThemeFile(
  key: string,
  source: ThemeSource,
  file: string,
  contents: string | Uint8Array,
): Promise<SaveFileResult> {
  if (source !== "uploaded") {
    return { ok: false, error: "Built-in themes can't be edited." };
  }
  if (file.endsWith(".html")) {
    const text = typeof contents === "string" ? contents : Buffer.from(contents).toString("utf-8");
    try {
      liquid.parse(text); // throws on malformed Liquid
    } catch (e) {
      return { ok: false, error: `Invalid Liquid template: ${(e as Error).message}` };
    }
  }
  const dir = themeDir(key, source);
  await fs.mkdir(dir, { recursive: true });
  const dest = themeFilePath(key, source, file); // validates name (traversal-safe)
  if (isImageFile(file)) {
    // Binary write — do NOT coerce to utf-8 (that corrupts images).
    const buf = typeof contents === "string" ? Buffer.from(contents) : Buffer.from(contents);
    await fs.writeFile(dest, buf);
  } else {
    const text = typeof contents === "string" ? contents : Buffer.from(contents).toString("utf-8");
    await fs.writeFile(dest, text, "utf-8");
  }
  return { ok: true };
}

// List the filenames actually present in an uploaded theme's dir (for the admin
// "uploaded so far" display). Returns [] if the dir doesn't exist yet. Only
// returns names we recognize, sorted, so stray files can't appear.
export async function listThemeFiles(key: string, source: ThemeSource): Promise<string[]> {
  try {
    const entries = await fs.readdir(themeDir(key, source));
    return entries.sort();
  } catch {
    return [];
  }
}

// Delete an uploaded theme: its files + the DB row. Built-in themes are never
// deletable. If the deleted theme was active, the engine falls back to "minimal".
export async function deleteUploadedTheme(key: string): Promise<void> {
  const row = await db.theme.findUnique({ where: { key } });
  if (!row || row.source !== "uploaded") return;
  await fs.rm(themeDir(key, "uploaded"), { recursive: true, force: true }).catch(() => {});
  await db.theme.delete({ where: { key } }).catch(() => {});
}

// Delete a single file from an uploaded theme. The filename is validated
// (traversal-safe via themeFilePath) before the unlink. Silently no-ops if the
// file doesn't exist. Only works on uploaded themes.
export async function deleteThemeFile(
  key: string,
  filename: string,
): Promise<{ ok: boolean; error?: string }> {
  const row = await db.theme.findUnique({ where: { key } });
  if (!row || row.source !== "uploaded") return { ok: false, error: "Theme not found or not editable." };
  try {
    const filePath = themeFilePath(key, "uploaded", filename); // validates + guards traversal
    await fs.rm(filePath, { force: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

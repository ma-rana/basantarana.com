// app/themes/[key]/[file]/route.ts
//
// Serves a theme's static files (CSS, images) directly — NOT template-filled.
// So <link rel="stylesheet" href="/themes/minimal/style.css"> works.
// Only allows safe, known file types and blocks path-traversal tricks.
//
// Themes can be built-in (repo themes/<key>/) or uploaded
// (THEME_UPLOAD_DIR/<key>/). We look up the theme's source from the DB so the
// right directory is served. Unknown keys are treated as built-in (back-compat).

import { promises as fs } from "fs";
import path from "path";
import { db } from "../../../../lib/db";
import { themeDir, isValidThemeKey, type ThemeSource } from "../../../../lib/themes/paths";

const TYPES: Record<string, string> = {
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string; file: string }> },
) {
  const { key, file } = await params;

  // Block traversal: only simple names, no slashes or ".." sequences.
  if (!isValidThemeKey(key) || !/^[a-z0-9._-]+$/i.test(file) || file.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response("Not allowed", { status: 403 });

  // Resolve which directory holds this theme's files (built-in vs uploaded).
  let source: ThemeSource = "builtin";
  try {
    const theme = await db.theme.findUnique({ where: { key } });
    if (theme?.source === "uploaded") source = "uploaded";
  } catch {
    /* DB hiccup -> assume built-in */
  }

  try {
    const full = path.join(themeDir(key, source), file);
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

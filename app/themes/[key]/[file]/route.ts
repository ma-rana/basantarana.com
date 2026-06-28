// app/themes/[key]/[file]/route.ts
//
// Serves a theme's static files (CSS, images) directly — NOT template-filled.
// So <link rel="stylesheet" href="/themes/minimal/style.css"> works.
// Only allows safe, known file types and blocks path-traversal tricks.

import { promises as fs } from "fs";
import path from "path";

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
  if (!/^[a-z0-9-]+$/i.test(key) || !/^[a-z0-9._-]+$/i.test(file) || file.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response("Not allowed", { status: 403 });

  try {
    const full = path.join(process.cwd(), "themes", key, file);
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

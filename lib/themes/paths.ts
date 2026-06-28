// lib/themes/paths.ts — theme file resolution + validation.
//
// Themes come from two places:
//   - "builtin"  -> the repo's themes/<key>/ (ships with the code)
//   - "uploaded" -> THEME_UPLOAD_DIR/<key>/ (admin uploads; survives redeploys)
// This module is the ONE place that knows where a theme's files live and which
// names are allowed. Keeping it central means the engine, the asset route, and
// the upload actions all agree — and the traversal guards live in one spot.

import path from "node:path";

export type ThemeSource = "builtin" | "uploaded";

// The exact set of NAMED files the engine reads. The engine only ever reads
// these names; images (below) are extra decoration served statically.
export const THEME_FILES = [
  "layout.html",
  "home.html",
  "about.html",
  "contact.html",
  "project.html",
  "style.css",
] as const;
export type ThemeFile = (typeof THEME_FILES)[number];

// The page files specifically (everything except the stylesheet) — used when
// validating that uploaded HTML parses as Liquid.
export const THEME_HTML_FILES = THEME_FILES.filter((f) => f.endsWith(".html"));

// Only home.html is REQUIRED for a theme to be valid/activatable. Everything
// else is optional: no layout.html -> serve the page unwrapped; no about/
// contact/project.html -> that URL 404s; no style.css -> theme uses inline CSS.
export const REQUIRED_THEME_FILES = ["home.html"] as const;

export function isRequiredThemeFile(file: string): boolean {
  return (REQUIRED_THEME_FILES as readonly string[]).includes(file);
}

// The optional URL-routed page files (home is required and routed separately).
// Used to build the `pages` flags themes use to guard nav links.
export const OPTIONAL_PAGE_FILES = ["about.html", "contact.html", "project.html"] as const;

// Image files a theme may include (decoration referenced from CSS/HTML as
// /themes/<key>/<name>). Unlike the six named files, images have arbitrary
// names, so they're validated by a STRICT filename pattern instead of an
// allowlist. The asset route already serves these content types.
export const THEME_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"] as const;

// A safe image filename: letters/digits/-/_ , exactly ONE dot, then an allowed
// image extension. No path separators, no "..", no extra dots (blocks tricks
// like "evil.php.png" or "../x.png"). This is the traversal guard for the
// arbitrary-name image path.
const IMAGE_EXT_ALTERNATION = THEME_IMAGE_EXTENSIONS.map((e) => "\\" + e).join("|");
const IMAGE_NAME_RE = new RegExp("^[A-Za-z0-9_-]+(?:" + IMAGE_EXT_ALTERNATION + ")$");

export function isImageFile(name: string): boolean {
  return (
    IMAGE_NAME_RE.test(name) &&
    !name.includes("..") &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}

// A file is allowed to be uploaded into a theme if it's one of the six named
// files OR a valid image filename. The engine reads only the six named files;
// images are decoration served statically.
export function isAllowedUploadName(name: string): boolean {
  return isValidThemeFile(name) || isImageFile(name);
}

// Human-readable list of what's accepted, for error messages and the UI hint.
export const ALLOWED_UPLOAD_HINT =
  "home.html, about.html, contact.html, project.html, layout.html, style.css, " +
  "and image files (.png .jpg .jpeg .svg .webp .ico)";

// A theme key must be a simple slug: lowercase letters, digits, hyphens. This
// is enforced everywhere a key is used as a path segment, so a key can never
// escape its directory.
const KEY_RE = /^[a-z0-9-]+$/;

export function isValidThemeKey(key: string): boolean {
  return KEY_RE.test(key) && key.length >= 2 && key.length <= 40 && !key.includes("..");
}

export function isValidThemeFile(file: string): file is ThemeFile {
  return (THEME_FILES as readonly string[]).includes(file);
}

// Resolve the absolute directory for a theme, given its source. The built-in
// root is the repo's themes/; the uploaded root is THEME_UPLOAD_DIR (default
// ./storage/themes), both resolved from cwd.
export function themeDir(key: string, source: ThemeSource): string {
  if (!isValidThemeKey(key)) {
    throw new Error(`Invalid theme key: ${key}`);
  }
  const root =
    source === "uploaded"
      ? path.resolve(process.cwd(), process.env.THEME_UPLOAD_DIR ?? "./storage/themes")
      : path.resolve(process.cwd(), "themes");
  const dir = path.join(root, key);

  // Defense in depth: the resolved dir must stay under its root. (KEY_RE already
  // prevents traversal, but this catches any future mistake.)
  if (path.relative(root, dir).startsWith("..")) {
    throw new Error(`Resolved theme dir escapes its root: ${key}`);
  }
  return dir;
}

// Resolve a single file within a theme, validating both key and filename. The
// file must be a named theme file OR a valid image name (both traversal-safe).
export function themeFilePath(key: string, source: ThemeSource, file: string): string {
  if (!isAllowedUploadName(file)) {
    throw new Error(`Invalid theme file: ${file}`);
  }
  return path.join(themeDir(key, source), file);
}

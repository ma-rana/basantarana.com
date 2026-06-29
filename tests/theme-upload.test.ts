// tests/theme-upload.test.ts — uploaded-theme validation + file storage.
// DB-backed (Theme rows) + filesystem (writes into a temp THEME_UPLOAD_DIR).
// Requires the add_theme_source migration applied to the test DB.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { db } from "../lib/db";
import { isValidThemeKey, isValidThemeFile, isImageFile, isAllowedUploadName, isCustomPageFile, THEME_FILES } from "../lib/themes/paths";
import {
  createUploadedTheme,
  saveThemeFile,
  getThemeFileStatus,
  listThemeFiles,
  deleteUploadedTheme,
} from "../lib/repos/theme";

let tmpDir: string;

beforeAll(async () => {
  // Point uploaded-theme storage at a throwaway temp dir for the test run.
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-upload-test-"));
  process.env.THEME_UPLOAD_DIR = tmpDir;
});

afterAll(async () => {
  await db.theme.deleteMany({ where: { source: "uploaded" } });
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

beforeEach(async () => {
  await db.theme.deleteMany({ where: { source: "uploaded" } });
});

describe("theme key/file validation", () => {
  it("accepts valid keys, rejects bad ones", () => {
    expect(isValidThemeKey("my-theme")).toBe(true);
    expect(isValidThemeKey("a")).toBe(false); // too short
    expect(isValidThemeKey("UPPER")).toBe(false);
    expect(isValidThemeKey("../etc")).toBe(false);
    expect(isValidThemeKey("with space")).toBe(false);
  });
  it("accepts only the known theme files", () => {
    expect(isValidThemeFile("home.html")).toBe(true);
    expect(isValidThemeFile("style.css")).toBe(true);
    expect(isValidThemeFile("evil.php")).toBe(false);
    expect(isValidThemeFile("../x")).toBe(false);
  });
});

describe("uploaded theme lifecycle", () => {
  it("creates a theme row + storage dir", async () => {
    const result = await createUploadedTheme("test-theme", "Test Theme");
    expect("kind" in result).toBe(false);
    const row = await db.theme.findUnique({ where: { key: "test-theme" } });
    expect(row?.source).toBe("uploaded");
    // dir exists
    await expect(fs.access(path.join(tmpDir, "test-theme"))).resolves.toBeUndefined();
  });

  it("rejects a duplicate key", async () => {
    await createUploadedTheme("dup", "Dup");
    const again = await createUploadedTheme("dup", "Dup 2");
    expect("kind" in again && again.kind).toBe("key_taken");
  });

  it("rejects an invalid key", async () => {
    const r = await createUploadedTheme("Bad Key", "x");
    expect("kind" in r && r.kind).toBe("invalid_key");
  });

  it("saves a valid Liquid html file", async () => {
    await createUploadedTheme("t1", "T1");
    const res = await saveThemeFile("t1", "uploaded", "home.html", "<h1>{{ profile.name }}</h1>");
    expect(res.ok).toBe(true);
    const status = await getThemeFileStatus("t1", "uploaded");
    expect(status["home.html"]).toBe(true);
    expect(status["about.html"]).toBe(false);
  });

  it("rejects a malformed Liquid html file (never reaches disk)", async () => {
    await createUploadedTheme("t2", "T2");
    const res = await saveThemeFile("t2", "uploaded", "home.html", "{% for x in items %}{{ x }}"); // unclosed
    expect(res.ok).toBe(false);
    const status = await getThemeFileStatus("t2", "uploaded");
    expect(status["home.html"]).toBe(false); // not written
  });

  it("saves css without Liquid validation", async () => {
    await createUploadedTheme("t3", "T3");
    const res = await saveThemeFile("t3", "uploaded", "style.css", "body { color: red; }");
    expect(res.ok).toBe(true);
  });

  it("refuses to write to a built-in theme", async () => {
    const res = await saveThemeFile("minimal", "builtin", "home.html", "<h1>x</h1>");
    expect(res.ok).toBe(false);
  });

  it("deletes an uploaded theme and its files", async () => {
    await createUploadedTheme("t4", "T4");
    await saveThemeFile("t4", "uploaded", "home.html", "<h1>x</h1>");
    await deleteUploadedTheme("t4");
    expect(await db.theme.findUnique({ where: { key: "t4" } })).toBeNull();
    await expect(fs.access(path.join(tmpDir, "t4"))).rejects.toThrow();
  });

  it("THEME_FILES covers the six expected files", () => {
    expect([...THEME_FILES].sort()).toEqual(
      ["about.html", "contact.html", "home.html", "layout.html", "project.html", "style.css"].sort(),
    );
  });
});

describe("upload name validation (named files + images)", () => {
  it("recognizes the six named files", () => {
    for (const f of THEME_FILES) expect(isAllowedUploadName(f)).toBe(true);
  });
  it("recognizes clean image names", () => {
    for (const f of ["logo.png", "hero-bg.jpg", "photo.jpeg", "icon.svg", "bg.webp", "favicon.ico"]) {
      expect(isImageFile(f)).toBe(true);
      expect(isAllowedUploadName(f)).toBe(true);
    }
  });
  it("recognizes custom .html pages (auto-routed at /<slug>)", () => {
    for (const f of ["skills.html", "blog.html", "my-page.html", "index.html"]) {
      expect(isCustomPageFile(f)).toBe(true);
      expect(isAllowedUploadName(f)).toBe(true);
    }
  });
  it("rejects custom pages whose slug is reserved or malformed", () => {
    // Reserved slugs would shadow fixed routes — not allowed as custom pages.
    for (const f of ["home.html", "about.html", "projects.html", "layout.html", "style.html"]) {
      expect(isCustomPageFile(f)).toBe(false);
    }
    // Bad slug shapes.
    for (const f of ["-bad.html", "bad-.html", "UPPER.html", "a b.html"]) {
      expect(isCustomPageFile(f)).toBe(false);
    }
  });
  it("rejects unrecognized names", () => {
    // Not a fixed file, not an image, not a valid custom .html page.
    for (const f of ["home.htm", "script.js", "readme.md", "data.json"]) {
      expect(isAllowedUploadName(f)).toBe(false);
    }
  });
  it("rejects traversal and filename tricks", () => {
    for (const f of ["../x.png", "a/b.png", "evil.php.png", "x.png.php", "logo..png", ".png"]) {
      expect(isAllowedUploadName(f)).toBe(false);
    }
  });
});

describe("image storage (binary, no Liquid check)", () => {
  it("writes image bytes without corruption and lists them", async () => {
    await createUploadedTheme("imgtheme", "Img");
    // bytes including non-utf8 values
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0x00, 0xc3, 0x28]);
    const res = await saveThemeFile("imgtheme", "uploaded", "logo.png", bytes);
    expect(res.ok).toBe(true);
    const back = await fs.readFile(path.join(tmpDir, "imgtheme", "logo.png"));
    expect(Buffer.compare(Buffer.from(bytes), back)).toBe(0); // identical bytes
    const files = await listThemeFiles("imgtheme", "uploaded");
    expect(files).toContain("logo.png");
  });

  it("does not Liquid-validate images (a .png with braces is fine)", async () => {
    await createUploadedTheme("imgtheme2", "Img2");
    const res = await saveThemeFile("imgtheme2", "uploaded", "x.svg", "<svg>{% not liquid %}</svg>");
    expect(res.ok).toBe(true); // images skip the Liquid parse gate
  });
});

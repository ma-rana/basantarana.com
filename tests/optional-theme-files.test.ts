// tests/optional-theme-files.test.ts — theme files are optional except home.html.
// Exercises the engine against an UPLOADED theme whose files we control on disk,
// plus a regression check that built-in themes (all files present) still work.
// DB-backed + filesystem. Requires the test DB migrations applied.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { db } from "../lib/db";
import { renderPage } from "../app/lib/render-theme";

let tmpDir: string;

// Helper: write a file into the active uploaded theme's dir.
async function writeThemeFile(key: string, file: string, contents: string) {
  const dir = path.join(tmpDir, key);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), contents, "utf-8");
}

async function makeActiveUploadedTheme(key: string) {
  await db.theme.deleteMany();
  await db.theme.create({ data: { key, name: key, isActive: true, source: "uploaded" } });
  await fs.mkdir(path.join(tmpDir, key), { recursive: true });
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "opt-theme-"));
  process.env.THEME_UPLOAD_DIR = tmpDir;

  // Minimal site data so pages have something to render.
  await db.engagementEvent.deleteMany();
  await db.projectTag.deleteMany();
  await db.project.deleteMany();
  await db.tag.deleteMany();
  await db.profile.deleteMany();
  await db.profile.create({
    data: {
      name: "Optional Test",
      headline: "h",
      bioVariants: { short: "s", medium: "m", long: "l" },
    },
  });
  await db.project.create({
    data: { slug: "proj-a", title: "Proj A", summary: "sum", status: "PUBLISHED", order: 1, content: [] },
  });
});

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 50)); // let fire-and-forget view writes settle
  await db.engagementEvent.deleteMany();
  await db.projectTag.deleteMany();
  await db.project.deleteMany();
  await db.tag.deleteMany();
  await db.profile.deleteMany();
  await db.theme.deleteMany();
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

beforeEach(async () => {
  await db.engagementEvent.deleteMany();
});

describe("only home.html present", () => {
  beforeEach(async () => {
    await makeActiveUploadedTheme("only-home");
    await writeThemeFile("only-home", "home.html", "<h1>{{ profile.name }}</h1>");
  });

  it("renders / from home.html with no layout (served unwrapped)", async () => {
    const { html, status } = await renderPage("/");
    expect(status).toBe(200);
    expect(html).toContain("<h1>Optional Test</h1>");
  });

  it("404s /about, /contact, and a project URL when those files are absent", async () => {
    expect((await renderPage("/about")).status).toBe(404);
    expect((await renderPage("/contact")).status).toBe(404);
    expect((await renderPage("/projects/proj-a")).status).toBe(404);
  });
});

describe("missing about.html", () => {
  beforeEach(async () => {
    await makeActiveUploadedTheme("no-about");
    await writeThemeFile(
      "no-about",
      "home.html",
      `<nav>{% if pages.about %}<a href="/about">About</a>{% endif %}{% if pages.contact %}<a href="/contact">Contact</a>{% endif %}</nav><h1>{{ profile.name }}</h1>`,
    );
    await writeThemeFile("no-about", "contact.html", "<h1>Contact</h1>");
  });

  it("returns 404 on /about", async () => {
    expect((await renderPage("/about")).status).toBe(404);
  });

  it("does not link /about in nav, but does link /contact (which exists)", async () => {
    const { html } = await renderPage("/");
    expect(html).not.toContain('href="/about"'); // pages.about is false -> hidden
    expect(html).toContain('href="/contact"'); // contact.html exists -> linked
  });

  it("still serves /contact (200)", async () => {
    expect((await renderPage("/contact")).status).toBe(200);
  });
});

describe("inline CSS, no style.css", () => {
  beforeEach(async () => {
    await makeActiveUploadedTheme("inline-css");
    await writeThemeFile(
      "inline-css",
      "home.html",
      `<style>body{color:tomato}</style><h1>{{ profile.name }}</h1>`,
    );
  });

  it("renders fine with inline CSS and no stylesheet file", async () => {
    const { html, status } = await renderPage("/");
    expect(status).toBe(200);
    expect(html).toContain("<style>body{color:tomato}</style>");
    expect(html).toContain("Optional Test");
  });
});

describe("layout.html present wraps the page", () => {
  beforeEach(async () => {
    await makeActiveUploadedTheme("with-layout");
    await writeThemeFile("with-layout", "layout.html", "<main>{{ content }}</main>");
    await writeThemeFile("with-layout", "home.html", "<h1>{{ profile.name }}</h1>");
  });

  it("wraps home in the layout when layout.html exists", async () => {
    const { html } = await renderPage("/");
    expect(html).toContain("<main><h1>Optional Test</h1></main>");
  });
});

describe("custom pages auto-route at /<name>", () => {
  beforeEach(async () => {
    await makeActiveUploadedTheme("custom-pages");
    await writeThemeFile(
      "custom-pages",
      "home.html",
      `<nav>{% if pages.skills %}<a href="/skills">Skills</a>{% endif %}{% if pages.blog %}<a href="/blog">Blog</a>{% endif %}</nav><h1>{{ profile.name }}</h1>`,
    );
    await writeThemeFile("custom-pages", "skills.html", "<h1>My Skills</h1><p>{{ profile.name }}</p>");
  });

  it("serves a custom skills.html at /skills (200)", async () => {
    const { html, status } = await renderPage("/skills");
    expect(status).toBe(200);
    expect(html).toContain("<h1>My Skills</h1>");
    expect(html).toContain("Optional Test"); // gets the same site data
  });

  it("404s a custom URL when the file is absent (/blog without blog.html)", async () => {
    expect((await renderPage("/blog")).status).toBe(404);
  });

  it("exposes pages.<slug> so nav can guard custom links", async () => {
    const { html } = await renderPage("/");
    expect(html).toContain('href="/skills"'); // skills.html exists
    expect(html).not.toContain('href="/blog"'); // blog.html absent
  });

  it("wraps a custom page in layout.html when present", async () => {
    await writeThemeFile("custom-pages", "layout.html", "<main>{{ content }}</main>");
    const { html } = await renderPage("/skills");
    expect(html).toContain("<main><h1>My Skills</h1>");
  });

  it("does not let a custom page shadow the fixed routes", async () => {
    // Even if someone uploads an 'about.html'-shaped custom name, /about still
    // maps to the fixed about page (here absent -> 404), and / stays home.
    expect((await renderPage("/")).status).toBe(200);
    // 'projects' is reserved: /projects/<slug> must still route to project.html
    // (absent here) rather than a custom 'projects' page.
    await writeThemeFile("custom-pages", "home.html", "<h1>{{ profile.name }}</h1>");
    expect((await renderPage("/")).status).toBe(200);
  });
});

describe("built-in themes still work (regression)", () => {
  beforeEach(async () => {
    await db.theme.deleteMany();
    await db.theme.create({ data: { key: "minimal", name: "Minimal", isActive: true, source: "builtin" } });
  });

  it("renders /, /about, /contact, and a project page", async () => {
    expect((await renderPage("/")).status).toBe(200);
    expect((await renderPage("/about")).status).toBe(200);
    expect((await renderPage("/contact")).status).toBe(200);
    expect((await renderPage("/projects/proj-a")).status).toBe(200);
  });

  it("links about and contact in nav (both files exist)", async () => {
    const { html } = await renderPage("/");
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/contact"');
  });
});

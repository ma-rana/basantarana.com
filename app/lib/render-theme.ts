// app/lib/render-theme.ts
//
// THE ENGINE (multi-page). It:
//   1. maps a URL to a page file in the active theme folder
//   2. fills that page's Liquid placeholders with data from the database
//   3. wraps the page in the theme's layout.html
//   4. returns finished HTML
//
// Flat theme folders: themes/<key>/{layout,home,about,contact,project}.html + style.css
// URL rules:
//   "/"                  -> home.html
//   "/about"             -> about.html
//   "/contact"           -> contact.html
//   "/projects/<slug>"   -> project.html  (one template, any project)
//
// liquidjs is sandboxed/logic-less -> theme files cannot query the DB or run
// arbitrary code; they only use the placeholders this engine provides.

import { Liquid } from "liquidjs";
import { db } from "../../lib/db";
import { getActiveMedia } from "./media";
import { promises as fs } from "fs";
import path from "path";

const engine = new Liquid({ strictVariables: false, strictFilters: false });

// Shared site data every page can use (mirrors PLACEHOLDER_CHEATSHEET.md).
// Public data only — PUBLISHED projects, never DRAFT/ARCHIVED.
async function getSiteData() {
  // Tolerate a not-yet-created profile: an empty DB should still render
  // (with blank profile fields) rather than 500 the whole public site.
  const profileRow = await db.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  const media = await getActiveMedia();
  const projects = await db.project.findMany({
    where: { status: "PUBLISHED" }, // <- DRAFT/ARCHIVED never reach a theme
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: { tags: { include: { tag: true } } },
  });
  const skills = await db.skill.findMany({ orderBy: { order: "asc" } });
  const stats = await db.platformStat.findMany({ orderBy: { order: "asc" } });

  const bio = (profileRow?.bioVariants as { short?: string; medium?: string; long?: string }) ?? {};

  return {
    profile: {
      name: profileRow?.name ?? "",
      headline: profileRow?.headline ?? "",
      email: profileRow?.email ?? "",
      location: profileRow?.location ?? "",
      bio: { short: bio.short ?? "", medium: bio.medium ?? "", long: bio.long ?? "" },
      // active media — same placeholder names in EVERY theme (null when unset):
      avatar: media.avatar,
      background: media.background,
      cover: media.cover,
      cv: media.cv,
    },
    projects: projects.map((p) => {
      const m = (p.media as { thumbnail?: string; gallery?: string[] }) ?? {};
      return {
        slug: p.slug, title: p.title, summary: p.summary, featured: p.featured,
        content: p.content,
        thumbnail: m.thumbnail ?? null, // null (not "") so {% if %} hides it
        gallery: m.gallery ?? [],
        tags: p.tags.map((t) => t.tag.name),
      };
    }),
    skills: skills.map((s) => ({ name: s.name, category: s.category, level: s.level })),
    stats: stats.map((s) => ({ platform: s.platform, label: s.label, value: s.value })),
  };
}

export async function getActiveThemeKey(): Promise<string> {
  const active = await db.theme.findFirst({ where: { isActive: true } });
  return active?.key ?? "minimal";
}

type SiteData = Awaited<ReturnType<typeof getSiteData>>;

// Map a URL path to { file, extra }. Returns null if no page matches (404).
function resolvePage(urlPath: string, site: SiteData) {
  const clean = urlPath.replace(/\/+$/, "") || "/";

  if (clean === "/")        return { file: "home.html",    extra: { page: { title: "Home" } } };
  if (clean === "/about")   return { file: "about.html",   extra: { page: { title: "About" } } };
  if (clean === "/contact") return { file: "contact.html", extra: { page: { title: "Contact" } } };

  const m = clean.match(/^\/projects\/([a-z0-9-]+)$/);
  if (m) {
    const project = site.projects.find((p) => p.slug === m[1]);
    if (!project) return null; // unknown or non-published slug -> 404
    return { file: "project.html", extra: { project, page: { title: project.title } } };
  }

  return null;
}

// Render one URL into a full HTML page. formStatus is for the contact page
// ("sent"/"error") after a form submit.
export async function renderPage(
  urlPath: string,
  opts: { formStatus?: string } = {},
): Promise<{ html: string; status: number }> {
  const key = await getActiveThemeKey();
  const dir = path.join(process.cwd(), "themes", key);
  const site = await getSiteData();

  const match = resolvePage(urlPath, site);
  if (!match) return { html: "Not found", status: 404 };

  const data = { ...site, ...match.extra, formStatus: opts.formStatus ?? "" };

  const pageTpl = await fs.readFile(path.join(dir, match.file), "utf-8");
  const content = await engine.parseAndRender(pageTpl, data);

  // Wrap in layout.html if present; otherwise return the page as-is.
  let html = content;
  try {
    const layoutTpl = await fs.readFile(path.join(dir, "layout.html"), "utf-8");
    html = await engine.parseAndRender(layoutTpl, { ...data, content });
  } catch {
    /* no layout.html — fine */
  }

  return { html, status: 200 };
}

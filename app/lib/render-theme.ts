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
import { getActiveLinks } from "../../lib/repos/link";
import { recordView, getLikeCountsBySlug } from "../../lib/repos/engagement";
import {
  themeDir,
  OPTIONAL_PAGE_FILES,
  customPageFileForSlug,
  isCustomPageFile,
  type ThemeSource,
} from "../../lib/themes/paths";
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
  const links = await getActiveLinks();
  const projects = await db.project.findMany({
    where: { status: "PUBLISHED" }, // <- DRAFT/ARCHIVED never reach a theme
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: { tags: { include: { tag: true } } },
  });
  const skills = await db.skill.findMany({ orderBy: { order: "asc" } });
  const stats = await db.platformStat.findMany({ orderBy: { order: "asc" } });
  const likeCounts = await getLikeCountsBySlug(); // slug -> like count (one query)

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
      video_background: media.video_background,
      // Named slots (image1, image2, cover1, video1, background1, …)
      // and lists (images, covers, backgrounds, videos) — spread from media.
      // Keys are dynamic so we can't list them statically here.
      ...Object.fromEntries(
        Object.entries(media).filter(([k]) =>
          !["avatar","background","cover","cv","video_background"].includes(k)
        )
      ),
      // External links: canonical {{ profile.link }} / {{ profile.link_label }},
      // numbered slots {{ profile.link1 }} (+ _label), and the slotted list
      // {% for l in profile.links %}{{ l.url }} {{ l.label }}{% endfor %}.
      ...links,
    },
    projects: projects.map((p) => {
      const m = (p.media as { thumbnail?: string; gallery?: string[] }) ?? {};
      return {
        slug: p.slug, title: p.title, summary: p.summary, featured: p.featured,
        content: p.content,
        thumbnail: m.thumbnail ?? null, // null (not "") so {% if %} hides it
        gallery: m.gallery ?? [],
        tags: p.tags.map((t) => t.tag.name),
        likes: likeCounts[p.slug] ?? 0, // like count for {{ project.likes }}
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

// Resolve the active theme's key AND source. The source decides where its files
// live (built-in repo dir vs. uploaded storage dir). Falls back to the built-in
// "minimal" theme if nothing is active or the active row is somehow missing.
export async function getActiveTheme(): Promise<{ key: string; source: ThemeSource }> {
  const active = await db.theme.findFirst({ where: { isActive: true } });
  if (!active) return { key: "minimal", source: "builtin" };
  return {
    key: active.key,
    source: active.source === "uploaded" ? "uploaded" : "builtin",
  };
}

// Does a given theme file exist on disk?
async function themeFileExists(dir: string, file: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, file));
    return true;
  } catch {
    return false;
  }
}

// Which optional pages exist for this theme, as flags themes use to guard nav
// links: { about: true/false, contact: ..., project: ... }. home is always the
// required page so it isn't included here. Themes write {% if pages.about %}.
//
// Custom pages are included too: any <slug>.html on disk (that isn't a reserved
// or fixed file) becomes pages.<slug> = true, so a theme's nav can guard custom
// links the same way: {% if pages.skills %}<a href="/skills">Skills</a>{% endif %}.
async function getPageFlags(dir: string): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};

  // Fixed optional pages.
  await Promise.all(
    OPTIONAL_PAGE_FILES.map(async (file) => {
      const name = file.replace(/\.html$/, ""); // "about.html" -> "about"
      flags[name] = await themeFileExists(dir, file);
    }),
  );

  // Custom pages: scan the theme dir for <slug>.html files that are valid custom
  // pages (not the fixed/reserved ones), and expose each as pages.<slug>.
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (!isCustomPageFile(entry)) continue;
      const slug = entry.slice(0, -".html".length);
      flags[slug] = true;
    }
  } catch {
    // No dir / unreadable -> just the fixed flags above.
  }

  return flags;
}

type SiteData = Awaited<ReturnType<typeof getSiteData>>;

// All custom-page slugs present on disk for this theme, as a list themes can
// iterate for an auto nav: {% for p in custom_pages %}<a href="/{{p}}">{{p}}</a>.
async function getCustomPageSlugs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((e) => isCustomPageFile(e))
      .map((e) => e.slice(0, -".html".length))
      .sort();
  } catch {
    return [];
  }
}

// A self-contained, simple 404 document. Public URLs are served by a route
// handler that returns raw HTML, and a missing/unknown page can't depend on a
// theme file existing — so this is a standalone page with inline CSS (works with
// no theme, no layout). Honors the visitor's light/dark preference and offers a
// clear, well-designed way back home.
function renderNotFound(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found</title>
<style>
  :root {
    --bg: #f7f8fa; --surface: #ffffff; --ink: #1f2733; --ink-soft: #5b6675;
    --ink-faint: #8a94a3; --line: #e3e7ed; --accent: #1f2733; --accent-hover: #334155;
    --accent-ink: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117; --surface: #161b22; --ink: #e6eaf0; --ink-soft: #aab3c0;
      --ink-faint: #79828f; --line: #262d36; --accent: #e6eaf0; --accent-hover: #ffffff;
      --accent-ink: #0d1117;
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    text-align: center;
    max-width: 400px;
  }
  .code {
    font-size: clamp(4rem, 3rem + 6vw, 6rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1;
    margin: 0;
    color: var(--ink);
  }
  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0.75rem 0 0.5rem;
    color: var(--ink);
  }
  p.msg {
    margin: 0 auto 2rem;
    max-width: 34ch;
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
  a.home {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--accent);
    color: var(--accent-ink);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.92rem;
    border-radius: 10px;
    transition: background 0.15s ease, transform 0.15s ease;
  }
  a.home:hover { background: var(--accent-hover); transform: translateY(-1px); }
  a.home:active { transform: translateY(0); }
  a.home:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  a.home svg { width: 1em; height: 1em; }
  @media (prefers-reduced-motion: reduce) {
    a.home { transition: none; }
  }
</style>
</head>
<body>
  <main class="wrap">
    <p class="code">404</p>
    <h1>Page not found</h1>
    <p class="msg">The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.</p>
    <a class="home" href="/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      Back to home
    </a>
  </main>
</body>
</html>`;
}

// Map a URL path to { file, extra }. Returns null if no page matches (404).
//
// Order matters: the fixed routes are checked FIRST so a custom page can never
// shadow "/", "/about", "/contact", or "/projects/<slug>". Any other single
// top-level segment /<name> is treated as a custom page and mapped to
// <name>.html (existence is checked by the caller). The reserved-slug guard in
// customPageFileForSlug stops e.g. /home or /projects from resolving here.
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

  // Custom top-level page: /<slug> -> <slug>.html (if it's a valid, non-reserved
  // custom slug). A friendly title is derived from the slug ("my-blog" -> "My
  // blog"); the theme can override via its own markup if it wants.
  const single = clean.match(/^\/([^/]+)$/);
  if (single) {
    const slug = single[1];
    const file = customPageFileForSlug(slug);
    if (file) {
      const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
      return { file, extra: { page: { title, slug } } };
    }
  }

  return null;
}

// Render one URL into a full HTML page. formStatus is for the contact page
// ("sent"/"error") after a form submit.
//
// File policy: only home.html is required. If the page file a URL maps to is
// absent for the active theme, the URL returns a clean 404 (no borrowing another
// theme's file). layout.html is optional (page served unwrapped if absent), and
// style.css is optional (themes may inline their CSS).
export async function renderPage(
  urlPath: string,
  opts: { formStatus?: string } = {},
): Promise<{ html: string; status: number }> {
  const { key, source } = await getActiveTheme();
  const dir = themeDir(key, source);
  const site = await getSiteData();

  const match = resolvePage(urlPath, site);
  if (!match) return { html: renderNotFound(), status: 404 };

  // The matched page file must actually exist for this theme. If it doesn't
  // (an optional page the theme didn't provide, or a deleted home.html), this
  // URL 404s — we do NOT fall back to another theme's copy.
  const pagePath = path.join(dir, match.file);
  if (!(await themeFileExists(dir, match.file))) {
    return { html: renderNotFound(), status: 404 };
  }

  // Record the view fire-and-forget: do NOT await, so a slow/failed analytics
  // write never delays or breaks the page render. recordView swallows errors.
  if (match.file === "home.html") {
    void recordView("profile");
  } else if (match.file === "project.html") {
    const slug = (match.extra as { project?: { slug?: string } }).project?.slug;
    if (slug) void recordView("project", slug);
  }

  // `pages` flags tell the theme which optional/custom pages exist, so its nav
  // can guard links: {% if pages.about %}<a href="/about">About</a>{% endif %}
  // and {% if pages.skills %}<a href="/skills">Skills</a>{% endif %}. The full
  // list of custom slugs is also provided for auto-generated nav.
  const pages = await getPageFlags(dir);
  const custom_pages = await getCustomPageSlugs(dir);

  const data = { ...site, ...match.extra, pages, custom_pages, formStatus: opts.formStatus ?? "" };

  const pageTpl = await fs.readFile(pagePath, "utf-8");
  const content = await engine.parseAndRender(pageTpl, data);

  // Wrap in layout.html if present; otherwise return the page as-is (layout is
  // optional). A theme can be a single self-contained home.html with inline CSS.
  let html = content;
  if (await themeFileExists(dir, "layout.html")) {
    const layoutTpl = await fs.readFile(path.join(dir, "layout.html"), "utf-8");
    html = await engine.parseAndRender(layoutTpl, { ...data, content });
  }

  return { html, status: 200 };
}

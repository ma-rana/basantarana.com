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
import { statDisplayValue } from "../../lib/repos/platform-stat";
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
      favicon: media.favicon,
      // Named slots (image1, image2, cover1, video1, background1, …)
      // and lists (images, covers, backgrounds, videos) — spread from media.
      // Keys are dynamic so we can't list them statically here.
      ...Object.fromEntries(
        Object.entries(media).filter(([k]) =>
          !["avatar","background","cover","cv","video_background","favicon"].includes(k)
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
    // Stats: a theme reads {{ stat.value }}. For API-backed stats that's the
    // live cached number; for manual stats it's the typed value. apiUrl is
    // NEVER exposed (it may hold a secret key) — only the resulting number.
    stats: stats.map((s) => ({ platform: s.platform, label: s.label, value: statDisplayValue(s) })),
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

// Ready-to-use animated stats counter, exposed as {{ stats_counter }}. Like
// {{ contact_form }}, it's a one-token drop-in: it emits the full stats block
// (each value in markup) PLUS a small <script> that counts each number up from
// 0 to its value when it scrolls into view. Numbers render as plain text first,
// so if JavaScript is off the final values still show (progressive enhancement).
//
// The animation RESPECTS prefers-reduced-motion: visitors who ask for less
// motion see the final numbers instantly, no counting.
//
// Styling hooks (style from your CSS): .stats-counter (wrapper), .stat-item,
// .stat-value, .stat-label. The script is scoped to THIS block via a unique
// data attribute so multiple counters / re-renders don't fight.
function renderStatsCounter(stats: { platform: string; label: string; value: number }[]): string {
  if (!stats.length) return "";

  const items = stats
    .map(
      (s) =>
        `  <div class="stat-item" data-platform="${escapeAttr(s.platform)}">
    <b class="stat-value" data-target="${s.value}">${s.value.toLocaleString()}</b>
    <small class="stat-label">${escapeHtml(s.label)}</small>
  </div>`,
    )
    .join("\n");

  // The script: count up when each number scrolls into view, once each,
  // reduced-motion aware. Robust against framework rendering (no reliance on
  // document.currentScript). Elements that are ALREADY in view at load animate
  // too (the observer fires for them immediately). A data flag prevents double
  // animation. Markup ships the FINAL value as text so non-JS visitors still see
  // the real number; the script resets to 0 only when it's about to animate.
  const script = `<script>
(function(){
  function init(){
    var els = document.querySelectorAll('.stats-counter .stat-value');
    if(!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function fmt(n){ return n.toLocaleString(); }
    function run(el){
      if(el.dataset.counted) return;
      el.dataset.counted = '1';
      var target = +el.getAttribute('data-target') || 0;
      if(reduce){ el.textContent = fmt(target); return; }
      var start = performance.now(), dur = 1200;
      el.textContent = '0';
      function tick(now){
        var p = Math.min((now-start)/dur, 1);
        var eased = 1 - Math.pow(1-p, 3);
        el.textContent = fmt(Math.floor(eased*target));
        if(p<1) requestAnimationFrame(tick); else el.textContent = fmt(target);
      }
      requestAnimationFrame(tick);
    }
    if(!('IntersectionObserver' in window)){ els.forEach(run); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    els.forEach(function(el){ io.observe(el); });
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
</script>`;

  return `<div class="stats-counter">\n${items}\n</div>\n${script}`;
}

// Minimal HTML escapers for helper-built markup (labels/platform come from the
// admin, but escape anyway — defense in depth, and platform is used in an attr).
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// Ready-to-use contact form, exposed to themes as {{ contact_form }}. A theme
// author can drop this single token to get a complete, working form without
// remembering the contract (field names, honeypot, status handling). It posts
// to /api/contact — the SAME contract a hand-built form uses — so the helper
// and the documented contract stay in sync (one source of truth).
//
// Styling: the markup carries stable class names (.contact-form, .contact-field,
// .contact-label, .contact-input, .contact-textarea, .contact-button, plus
// .contact-status.is-sent / .is-error) so a theme styles it entirely from its
// own CSS without touching the markup. `formStatus` ('sent' | 'error' | '')
// drives the inline status message.
function renderContactForm(formStatus: string): string {
  const status =
    formStatus === "sent"
      ? `<p class="contact-status is-sent" role="status">Thanks &mdash; your message was sent.</p>`
      : formStatus === "error"
        ? `<p class="contact-status is-error" role="alert">Something went wrong. Please try again.</p>`
        : "";

  return `${status}
<form class="contact-form" method="POST" action="/api/contact">
  <label class="contact-field">
    <span class="contact-label">Name</span>
    <input class="contact-input" type="text" name="name" required maxlength="100">
  </label>
  <label class="contact-field">
    <span class="contact-label">Email</span>
    <input class="contact-input" type="email" name="email" required maxlength="200">
  </label>
  <label class="contact-field">
    <span class="contact-label">Message</span>
    <textarea class="contact-textarea" name="message" rows="5" required maxlength="5000"></textarea>
  </label>
  <div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;">
    <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
  </div>
  <button class="contact-button" type="submit">Send message</button>
</form>`;
}

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

  const data = {
    ...site,
    ...match.extra,
    pages,
    custom_pages,
    formStatus: opts.formStatus ?? "",
    contact_form: renderContactForm(opts.formStatus ?? ""),
    // Animated stats counter (markup + count-up script), one-token drop-in.
    // Same pattern as contact_form. Themes that want custom markup can instead
    // loop `stats` and add their own script (see PLACEHOLDER_CHEATSHEET.md).
    stats_counter: renderStatsCounter(site.stats),
    // The active theme's key + a ready-made stylesheet URL, so a theme can link
    // its OWN style.css portably regardless of what it's named:
    //   <link rel="stylesheet" href="{{ style_url }}">
    // (equivalently "/themes/{{ theme_key }}/style.css"). This avoids the
    // footgun of hardcoding a theme key in the <link> that breaks when the
    // theme is renamed or copied.
    theme_key: key,
    style_url: `/themes/${key}/style.css`,
    // The active site favicon URL (or null). A theme can place it explicitly:
    //   <link rel="icon" href="{{ favicon }}">
    // and if it doesn't, the engine auto-injects it into <head> (see below), so
    // the favicon works whether or not the theme references it.
    favicon: site.profile.favicon ?? null,
  };

  const pageTpl = await fs.readFile(pagePath, "utf-8");
  const content = await engine.parseAndRender(pageTpl, data);

  // Wrap in layout.html if present; otherwise return the page as-is (layout is
  // optional). A theme can be a single self-contained home.html with inline CSS.
  let html = content;
  if (await themeFileExists(dir, "layout.html")) {
    const layoutTpl = await fs.readFile(path.join(dir, "layout.html"), "utf-8");
    html = await engine.parseAndRender(layoutTpl, { ...data, content });
  }

  // Favicon auto-fallback: if a favicon is set and the theme didn't already add
  // its own icon link (e.g. via {{ favicon }}), inject one into <head> so the
  // favicon works regardless of whether the theme references it. We only inject
  // when there's a <head> to inject into and no existing rel="icon".
  const fav = site.profile.favicon;
  if (fav && /<head[^>]*>/i.test(html) && !/rel=["'][^"']*\bicon\b/i.test(html)) {
    const tag = `<link rel="icon" href="${fav}">`;
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n  ${tag}`);
  }

  return { html, status: 200 };
}

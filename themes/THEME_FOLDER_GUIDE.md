# THEME FOLDER GUIDE — how to build a multi-page theme

> A theme is a FLAT folder of HTML pages + one CSS file + a layout. Upload it
> like a public_html folder. Each page maps to a real URL on the live site.
> Keep it flat — no subfolders needed.

## Two kinds of theme: built-in vs uploaded
There are two ways a theme gets into the system:

1. **Built-in** — a folder committed to the repo under `themes/<key>/` (the
   three that ship: minimal, showcase, simple-basic). Edited in code, deployed
   with the app.
2. **Uploaded** — created from the admin (Themes → Create a theme), then its
   files are uploaded one at a time. Stored OUTSIDE the repo in
   `THEME_UPLOAD_DIR` (default `./storage/themes/<key>/`) so they survive
   redeploys. Same engine, same placeholders, same URL rules — only the storage
   location differs.

### Uploading a theme from the admin
1. Themes → **Create a theme** → enter a key (lowercase-hyphens) and display name.
2. On the theme's page, upload each file into its slot: `layout.html`,
   `home.html`, `about.html`, `contact.html`, `project.html`, `style.css`.
3. Each `.html` is validated as a Liquid template on upload — a malformed file is
   rejected and never saved, so it can't break the public site.
4. Once all page files are present, **Activate** the theme.

The files are identical in form to built-in themes (this guide's placeholders and
URL rules all apply). The easiest way to make one is to copy a built-in theme's
files, tweak them, and upload them. Note the CSS link inside your uploaded
`layout.html` must still be `/themes/<your-key>/style.css`.

## Which files are required
Only **`home.html`** is required for a theme to be valid and activatable. Every
other file is optional:
- **No `layout.html`** → each page is served on its own, unwrapped. (Put your
  `<!DOCTYPE html>`, `<head>`, and CSS link straight in the page files instead.)
- **No `about.html` / `contact.html` / `project.html`** → that URL returns a
  clean 404, and the nav won't link to it (see `pages` flags below).
- **No `style.css`** → fine; put your CSS in a `<style>` block inline. A
  single self-contained `home.html` with inline CSS is a complete valid theme.

### The `pages` flags (don't link missing pages)
The engine tells each page which optional pages exist, so your nav can hide
links to pages this theme doesn't provide:
```liquid
<nav>
  <a href="/">Home</a>
  {% if pages.about %}<a href="/about">About</a>{% endif %}
  {% if pages.contact %}<a href="/contact">Contact</a>{% endif %}
</nav>
```
`pages.about`, `pages.contact`, `pages.project` are true only when that file
exists for the active theme. (Home is always present — it's required.)

## The folder (flat)
The folder NAME is the theme's name (its "key"). Name it after the style —
`simple-basic`, `dark-modern`, `client-acme` — not a generic "my-theme".
```
themes/
  simple-basic/             ← folder name = the theme key
    layout.html     ← shared wrapper: header, footer, nav, links the CSS. REQUIRED.
    home.html       ← served at  /
    about.html      ← served at  /about
    contact.html    ← served at  /contact
    project.html    ← served at  /projects/<slug>  (one file, every project)
    style.css       ← shared stylesheet, linked once in layout.html
```

## Naming rules (IMPORTANT — three places must match)
The folder name connects to three things, and they must all use the SAME name:
1. **The folder**: `themes/simple-basic/`
2. **The database key**: the `Theme.key` value is `"simple-basic"` (this is how
   "set active" finds the folder).
3. **The CSS path inside that theme's layout.html**:
   `<link rel="stylesheet" href="/themes/simple-basic/style.css">`

Use lowercase + hyphens, no spaces or capitals: `simple-basic` ✓, `Simple Basic` ✗.

## URL rules (which file serves which URL)
| URL on the live site            | File         |
|---------------------------------|--------------|
| `basantarana.com/`              | home.html    |
| `basantarana.com/about`         | about.html   |
| `basantarana.com/contact`       | contact.html |
| `basantarana.com/projects/<x>`  | project.html |

To add a page, add the file AND a line in the engine's URL map
(app/lib/render-theme.ts → resolvePage).

## layout.html — the shared wrapper
The current page's HTML drops into `{{ content }}`. Put header/nav/footer and
the `<link rel="stylesheet">` here once, so every page gets them.

## CSS and images
- One `style.css`, linked once in layout.html. Path: `/themes/<key>/style.css`.
- Images: drop them in the folder, reference `/themes/<key>/logo.png`.
- The engine serves `.css/.png/.jpg/.svg/.webp/.ico` files directly (not
  template-filled). Everything else is treated as a page template.

## Forms (the one thing that needs system code)
A `<form>` SHOWS in your HTML, but submitting needs a handler. The contact form
POSTs to `/api/contact` (app/api/contact/route.ts), which validates, saves, and
redirects back with ?sent=1 / ?error=1 so the page can show `{{ formStatus }}`.

## Content blocks (project.html)
A project's body is an array of typed blocks. In project.html, loop and switch
on `block.type`. The fields per type (these MUST match the admin editor):
```liquid
{% for block in project.content %}
  {% if block.type == "heading" %}
    {% if block.level == 3 %}<h3>{{ block.text }}</h3>{% else %}<h2>{{ block.text }}</h2>{% endif %}
  {% elsif block.type == "text" %}
    <div>{{ block.html }}</div>        {# already sanitized on save; emit as-is #}
  {% elsif block.type == "code" %}
    <pre><code>{{ block.code }}</code></pre>   {# block.language available #}
  {% elsif block.type == "image" %}
    <img src="{{ block.url }}" alt="{{ block.alt }}">
  {% elsif block.type == "embed" %}
    <a href="{{ block.url }}">{{ block.url }}</a>
  {% endif %}
{% endfor %}
```

## Rules of the road
- Keep it FLAT. No subfolders (the engine doesn't look in them).
- Each page is plain HTML + Liquid placeholders. CSS in style.css.
- Test locally with seeded data, then upload the SAME folder live.

## How to add a NEW theme
1. Copy an existing theme folder as a starting point.
2. Update the CSS path in the new folder's layout.html to match the new name.
3. Edit pages and style.css. (Content stays as `{{ placeholders }}`.)
4. Register it in the DB (seed row or the admin Themes screen):
   `{ key: "simple-basic", name: "Simple Basic", isActive: false }`
5. Test locally — set it active, load /, /about, /contact, a project. Confirm CSS loads.
6. Go live — deploy the repo (the folder ships with it), set active in admin.

## Quick checklist when a new theme misbehaves
- Page totally unstyled? → CSS path in layout.html doesn't match the folder name.
- "Not found" on /about? → about.html missing, or URL not in the engine's map.
- Theme doesn't switch? → the DB `key` doesn't match the folder name.
- A placeholder is blank? → that field doesn't exist; check PLACEHOLDER_CHEATSHEET.md.

## Media in themes
- **Shared media** (avatar, background, cover, CV): managed in the admin library
  (upload many, activate one per type). Reference the active one by FIXED names —
  the SAME in every theme: {{ profile.avatar }} {{ profile.background }}
  {{ profile.cover }} {{ profile.cv }}. Each is optional — wrap in {% if %}.
- **Theme decoration** (a texture for ONE style): ships in the folder like
  style.css, referenced as /themes/<key>/bg.jpg.

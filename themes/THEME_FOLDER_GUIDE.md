# THEME FOLDER GUIDE — how to build a multi-page theme

> A theme is a FLAT folder of HTML pages + one CSS file + a layout. Upload it
> like a public_html folder. Each page maps to a real URL on the live site.
> Keep it flat — no subfolders needed.

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

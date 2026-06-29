# PLACEHOLDER CHEAT SHEET — for theme .html files

> Keep this open while writing a theme. These are the ONLY placeholders that
> work, because they're the only data the engine provides. Liquid syntax.
> A typo'd placeholder renders empty — it won't crash the page.

## The three rules you'll use most
```liquid
{{ value }}                              insert one value
{% for x in list %} ... {% endfor %}     repeat for each item in a list
{% if value %} ... {% endif %}           show the inside only if value exists
```

## Profile
```liquid
{{ profile.name }}
{{ profile.headline }}
{{ profile.email }}
{{ profile.location }}
{{ profile.bio.short }}      ← short version (compact themes)
{{ profile.bio.medium }}
{{ profile.bio.long }}       ← long version (rich themes)
```

## Media (the ACTIVE one of each type — same names in EVERY theme)
Optional — wrap in {% if %}. Unset values are null (correctly falsy).
```liquid
{% if profile.avatar %}<img src="{{ profile.avatar }}">{% endif %}
{% if profile.background %}<div style="background-image:url('{{ profile.background }}')">{% endif %}
{% if profile.cover %}<img src="{{ profile.cover }}">{% endif %}
{% if profile.cv %}<a href="{{ profile.cv }}" download>Download CV</a>{% endif %}
{% if profile.video_background %}<video autoplay muted loop playsinline src="{{ profile.video_background }}"></video>{% endif %}
```

Video and image backgrounds are independent. A theme can offer a video with an
image fallback for browsers that block autoplay:
```liquid
{% if profile.video_background %}
  <video autoplay muted loop playsinline src="{{ profile.video_background }}"></video>
{% elsif profile.background %}
  <div style="background-image:url('{{ profile.background }}')"></div>
{% endif %}
```

## Named slots (multiple assets of the same type)
In the admin, any asset can be assigned a numbered slot. Slotted assets get
predictable placeholder names themes can reference independently on different
parts of a page.

| Admin group       | Slot placeholders         | List placeholder        |
|-------------------|---------------------------|-------------------------|
| Avatar / Photos   | `{{ profile.image1 }}`… | `{{ profile.images }}`  |
| Cover             | `{{ profile.cover1 }}`…  | `{{ profile.covers }}`  |
| Background image  | `{{ profile.background1 }}`… | `{{ profile.backgrounds }}` |
| Video background  | `{{ profile.video1 }}`…  | `{{ profile.videos }}`  |

Slot numbers follow upload order (1, 2, 3…) and are set in the admin with the
“+ Slot” button per asset. Slots coexist with the single-active system —
`{{ profile.avatar }}` and `{{ profile.image1 }}` can point to different assets.

Example — hero uses slot 1, about section uses slot 2:
```liquid
<section class="hero">
  {% if profile.image1 %}<img src="{{ profile.image1 }}">{% endif %}
</section>
<section class="about">
  {% if profile.image2 %}<img src="{{ profile.image2 }}">{% endif %}
</section>
```

Loop over all slotted images:
```liquid
{% for img in profile.images %}
  <img src="{{ img }}">
{% endfor %}
```

Slots that haven’t been filled are null (falsy), so `{% if profile.image3 %}` hides
correctly if only two images are slotted.

## Links (social profiles / external URLs)
Add links in the admin Media → Links tab. Two ways to reference them in a theme:

**By name (key)** — give a link a *key* (e.g. `github`) and reference it directly.
Best for social icons in a fixed spot. The key is stable; it survives reordering.
```liquid
{% if profile.link_github %}
  <a href="{{ profile.link_github }}">{{ profile.link_github_label }}</a>
{% endif %}
```

**By slot / loop** — assign links to numbered slots (the “+ Slot” button) and loop
them. Best for a generic row of links where order is all that matters.
```liquid
{% for l in profile.links %}
  <a href="{{ l.url }}">{{ l.label }}</a>
{% endfor %}
```
Numbered slots also work individually: `{{ profile.link1 }}` + `{{ profile.link1_label }}`.

| Reference        | Placeholder                          | Set in admin by      |
|------------------|--------------------------------------|----------------------|
| Active (single)  | `{{ profile.link }}` / `{{ profile.link_label }}` | Activate         |
| Named key        | `{{ profile.link_<key> }}` / `…_label` | typing a Key       |
| Numbered slot    | `{{ profile.link1 }}` / `{{ profile.link1_label }}` | + Slot          |
| All slotted      | `{% for l in profile.links %}` (l.url, l.label) | + Slot            |

A single link can have BOTH a key and a slot — then it's reachable by name AND in
the loop. Unset references are null (falsy), so `{% if profile.link_github %}` hides
cleanly when that key doesn't exist.

## Projects (a list — loop over it). PUBLISHED only; drafts never appear.
```liquid
{% for project in projects %}
  {{ project.title }}
  {{ project.summary }}
  {{ project.slug }}
  {{ project.featured }}
  {% if project.thumbnail %}<img src="{{ project.thumbnail }}">{% endif %}   ← optional
  {% for img in project.gallery %}{{ img }}{% endfor %}                       ← optional
  {% for tag in project.tags %}{{ tag }}{% endfor %}
  {{ project.likes }}                                                         ← like count (number)
{% endfor %}
```

## Like button (project.html)
Projects can be liked anonymously. Add a form that POSTs the slug to the like
handler; the engine provides the current count as `{{ project.likes }}`.
```liquid
<form method="POST" action="/api/engagement/like">
  <input type="hidden" name="slug" value="{{ project.slug }}">
  <button type="submit">♥ Like</button>
  <span>{{ project.likes }}</span>
</form>
```
The handler sets an anonymous cookie so one visitor can't inflate the count, then
redirects back. Views (home + project pages) are recorded automatically by the
engine — no theme markup needed for those.

## A single project's content blocks (on project.html, via {{ project }})
```liquid
{% for block in project.content %}
  {% if block.type == "heading" %}{{ block.text }} (block.level is 2 or 3){% endif %}
  {% if block.type == "text" %}{{ block.html }}  ← sanitized HTML, emit as-is{% endif %}
  {% if block.type == "code" %}{{ block.code }} (block.language available){% endif %}
  {% if block.type == "image" %}{{ block.url }} / {{ block.alt }}{% endif %}
  {% if block.type == "embed" %}{{ block.url }}{% endif %}
{% endfor %}
```

## Skills (a list)
```liquid
{% for skill in skills %}
  {{ skill.name }}
  {{ skill.category }}
  {{ skill.level }}      ← 0–100
{% endfor %}
```

## Stats (a list — your platform numbers)
```liquid
{% for stat in stats %}
  {{ stat.platform }}    ← "github", "youtube", "linkedin"
  {{ stat.label }}       ← "Followers", "Subscribers"
  {{ stat.value }}       ← the number
{% endfor %}
```

## Handy extras (Liquid built-ins)
```liquid
{{ projects.size }}                    how many projects
{{ profile.name | upcase }}            UPPERCASE a value
{{ project.summary | truncate: 80 }}   shorten to 80 chars
{% if project.featured %}★{% endif %}  show a star only for featured projects
```

## Contact form (contact.html)
Two ways to put a working contact form on the page. Both post to `/api/contact`,
which validates, saves the message (you read it in the admin → Messages inbox),
and applies spam protection (honeypot + per-IP rate limit).

**Easy: the helper.** Drop one token for a complete, working form (fields +
honeypot + status message). Style it from your CSS via the `.contact-*` classes.
```liquid
{{ contact_form }}
```
Classes it outputs: `.contact-form`, `.contact-field`, `.contact-label`,
`.contact-input`, `.contact-textarea`, `.contact-button`, and the status line
`.contact-status.is-sent` / `.contact-status.is-error`.

**Full control: build your own.** Style and structure everything yourself, as
long as you follow the contract:
- POST to `/api/contact`
- field names EXACTLY `name`, `email`, `message`
- include the hidden honeypot field named `website` (bots fill it; you hide it)
- use `{{ formStatus }}` ("sent" / "error" / "") for the result message
```liquid
{% if formStatus == "sent" %}<p class="ok">Thanks — your message was sent.</p>
{% elsif formStatus == "error" %}<p class="err">Something went wrong.</p>{% endif %}

<form method="POST" action="/api/contact">
  <label>Name<input type="text" name="name" required></label>
  <label>Email<input type="email" name="email" required></label>
  <label>Message<textarea name="message" required></textarea></label>
  {%- comment -%} Honeypot: keep it visually hidden. {%- endcomment -%}
  <div aria-hidden="true" style="position:absolute;left:-9999px;">
    <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
  </div>
  <button type="submit">Send message</button>
</form>
```
If you omit the honeypot, the rate limit still protects you — the honeypot is a
bonus layer. Field names must match exactly or the submission fails validation.
Tip: pair the form with `{{ profile.email }}` for an "email me directly" link.

## Styling your theme (CSS)
Two ways to add CSS — pick whichever suits the theme:

**Inline `<style>`** — put a `<style>…</style>` block right in `home.html` (or
`layout.html`). Self-contained, no extra file, no path to get wrong. Great for a
simple single-file theme.

**External `style.css`** — upload a `style.css` alongside your HTML and link it in
`layout.html`. Cleaner for bigger themes. **Link it portably** with the
`{{ style_url }}` placeholder so it works no matter what your theme is named:
```liquid
<link rel="stylesheet" href="{{ style_url }}">
```
This resolves to `/themes/<your-theme-key>/style.css` automatically. Do NOT
hardcode the key (`href="/themes/minimal/style.css"`) — that breaks the moment the
theme is renamed or copied. The matching placeholders:
- `{{ style_url }}` — the full URL to THIS theme's `style.css`.
- `{{ theme_key }}` — this theme's key, e.g. for linking other assets:
  `href="/themes/{{ theme_key }}/banner.png"`.

Images you upload into the theme are served at `/themes/{{ theme_key }}/<name>`
(see THEME_FOLDER_GUIDE.md). You can use either approach, or both.

## Animated counter (stats that count up)
Make your stats count up from 0 to their value when they scroll into view. Two
ways, same idea as the contact form.

**Easy: the helper.** One token renders the whole stats block AND the count-up
script. It animates on scroll, respects reduced-motion (instant for those users),
and shows the final numbers even if JavaScript is off.
```liquid
{{ stats_counter }}
```
Style via these classes: `.stats-counter` (wrapper), `.stat-item`, `.stat-value`
(the number), `.stat-label`. Tip: add `font-variant-numeric: tabular-nums;` to
`.stat-value` so digits don't jiggle while counting.

**Full control: your own markup + script.** Loop the stats yourself, put the
target in a data attribute, and add a small script. This is the one place a
theme legitimately uses JavaScript — placeholders give the number, JS animates it.
```liquid
<div class="stats">
  {% for stat in stats %}
    <b class="count-up" data-target="{{ stat.value }}">0</b>
    <small>{{ stat.label }}</small>
  {% endfor %}
</div>
<script>
  document.querySelectorAll('.count-up').forEach(function(el){
    var target = +el.dataset.target, start = performance.now();
    function tick(now){
      var p = Math.min((now-start)/1200, 1);
      el.textContent = Math.floor(p*target).toLocaleString();
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
</script>
```
Note: a placeholder (`{{ stat.value }}`) can only output the number — it can't
animate by itself. Animation always needs a `<script>`; the helper just bundles
one for you. (For accessibility, gate the animation on
`window.matchMedia('(prefers-reduced-motion: reduce)')` as the helper does.)

## Page-specific placeholders
- `{{ page.title }}` — set per page, used in <title>. Available everywhere.
- `{{ content }}` — in layout.html only; the current page's HTML drops in here.
- `{{ project }}` — on project.html only; the project matched by the URL.
- `{{ formStatus }}` — on contact.html only; "sent" / "error" / "" after submit.
- `{{ contact_form }}` — on contact.html; renders a complete, ready-to-post form.
- `{{ stats_counter }}` — renders the stats block with a count-up animation.

## Home page composition (home.html)
The home page's layout lives entirely in `home.html` — the theme author decides
which bands appear and in what order by writing them directly. There's no
data-driven section list. A typical home loops the lists this cheat sheet
describes (projects, skills, stats) inside whatever band markup you want, in the
order you write them:
```liquid
<section class="hero">...{{ profile.name }}...</section>
<section>...{{ profile.bio.medium }}...</section>
{% if projects.size > 0 %}<section>...loop projects...</section>{% endif %}
{% if skills.size > 0 %}<section>...loop skills...</section>{% endif %}
{% if stats.size > 0 %}<section>...loop stats...</section>{% endif %}
<section>...contact CTA...</section>
```
Reorder, add, or drop bands by editing home.html. Each `{% if ... %}` keeps a
band from rendering empty when there's no data for it.

## Rules of the road
- Only the placeholders above work — they map to real data. Inventing
  `{{ profile.favouriteColor }}` renders empty; there's no such field.
- To get a NEW placeholder, the system must add that content type first (code +
  DB change), THEN it becomes available here.
- CSS: link `style.css` portably with `{{ style_url }}` (never hardcode the theme
  key), or use an inline `<style>` block. See "Styling your theme" above.
- See THEME_FOLDER_GUIDE.md for folder structure and how to add a new theme.

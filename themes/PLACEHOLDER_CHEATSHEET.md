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

## Page-specific placeholders
- `{{ page.title }}` — set per page, used in <title>. Available everywhere.
- `{{ content }}` — in layout.html only; the current page's HTML drops in here.
- `{{ project }}` — on project.html only; the project matched by the URL.
- `{{ formStatus }}` — on contact.html only; "sent" / "error" / "" after submit.

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
- CSS goes in style.css (linked once in layout.html). Path: /themes/<key>/style.css.
- See THEME_FOLDER_GUIDE.md for folder structure and how to add a new theme.

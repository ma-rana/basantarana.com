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
```

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
{% endfor %}
```

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

## Rules of the road
- Only the placeholders above work — they map to real data. Inventing
  `{{ profile.favouriteColor }}` renders empty; there's no such field.
- To get a NEW placeholder, the system must add that content type first (code +
  DB change), THEN it becomes available here.
- CSS goes in style.css (linked once in layout.html). Path: /themes/<key>/style.css.
- See THEME_FOLDER_GUIDE.md for folder structure and how to add a new theme.

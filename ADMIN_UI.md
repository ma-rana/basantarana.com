# ADMIN_UI.md — Admin design system

Living documentation for the **admin portal** UI (everything under `app/admin/`).
The source of truth is `app/globals.css` (the block under
`/* Admin area — calm slate / neutral system */`). This file explains how to
*use* that system; when the two disagree, the CSS wins — update this doc to match.

The public site is **not** covered here. Public pages are rendered by themes
(Liquid templates), which own their own styling; admin CSS never reaches them.

---

## 1. Principles

Internal tooling: quiet, legible, out of the way. The interface should recede so
the content (projects, skills, media) is what stands out.

- **One accent, used sparingly.** A muted slate-blue marks the active nav item,
  focus rings, and primary actions — nothing else competes for attention.
- **Token-driven.** Every color, radius, and shadow is a CSS custom property
  scoped to `.admin-shell` / `.login-screen`. Re-theming is one block, and dark
  mode is a parallel block — components never hardcode a hex value.
- **Mobile-first, then enhanced.** Base styles target small screens; media
  queries *add* the sidebar and roomier padding at wider viewports.
- **Accessible by default.** Visible focus everywhere, semantic colors backed by
  text/icons (never color alone), reduced-motion respected.

---

## 2. Design tokens

Defined on `.admin-shell, .login-screen` in `app/globals.css`, with a dark-mode
override under `@media (prefers-color-scheme: dark)`. Always reference the
variable — never paste the hex.

### Surfaces & ink
| Token | Light | Role |
|---|---|---|
| `--adm-bg` | `#f7f8fa` | App background (behind cards) |
| `--adm-surface` | `#ffffff` | Cards, sidebar, inputs, rows |
| `--adm-surface-2` | `#f1f3f6` | Recessed fills: table headers, hovers, chips |
| `--adm-ink` | `#1f2733` | Primary text, headings |
| `--adm-ink-soft` | `#5b6675` | Secondary text, labels |
| `--adm-ink-faint` | `#8a94a3` | Tertiary: hints, captions, muted |
| `--adm-line` | `#e3e7ed` | Default borders, dividers |
| `--adm-line-strong` | `#cdd4de` | Input borders, emphasized edges |

### Accent & focus
| Token | Light | Role |
|---|---|---|
| `--adm-accent` | `#475569` | Active-nav edge, hover borders |
| `--adm-accent-strong` | `#334155` | Primary button fill, active-nav text |
| `--adm-accent-tint` | `#eef1f5` | Active-nav background, subtle highlight |
| `--adm-focus` | `#2563eb` | Focus-ring color (kept distinct from accent on purpose) |

### Status
| Token | Light | Role |
|---|---|---|
| `--adm-danger` | `#c0392b` | Errors, destructive actions, invalid fields |
| `--adm-ok` | `#2e7d4f` | Success, "published" |
| `--adm-warn` | `#b7791f` | Warnings, "archived" |

### Geometry
| Token | Value | Role |
|---|---|---|
| `--adm-radius` | `10px` | Cards, tables, groups |
| `--adm-radius-sm` | `7px` | Inputs, buttons, nav items |
| `--adm-radius-pill` | `999px` | Badges, tags |
| `--adm-shadow` | layered | Card elevation (subtle; not a drop shadow) |
| `--adm-nav-w` | `248px` → `264px` @1280 | Sidebar width |

> **Dark mode** flips surfaces to a `#0d1117` family and lifts ink to light. The
> accent inverts (a light slate on dark) and status colors brighten for contrast.
> Because components only read tokens, no component code changes for dark mode.

---

## 3. Typography

Family is the app's `--font-sans` (Geist, loaded in `app/layout.tsx`);
`--font-mono` (Geist Mono) for keys, slots, and code previews.

The scale uses `clamp()` for the largest sizes so headings shrink gracefully on
small screens without a media query.

| Use | Size | Weight |
|---|---|---|
| Page title (`h1`) | `clamp(1.5rem → 1.9rem)` | 700 |
| Metric / stat value | `clamp(1.6rem → 2rem)` | 680 |
| Section subhead (eyebrow) | `0.78rem`, uppercase, `0.06em` tracking | 650 |
| Body / paragraph | `0.92rem` | 400 |
| Input text | `0.95rem` | 400 |
| Label | `0.84rem` | 550 |
| Hint / caption | `0.78rem` | 400 |
| Table header | `0.72rem`, uppercase | 650 |

Headings use slight negative letter-spacing (`-0.02em`) for a tighter,
more deliberate feel; uppercase eyebrows use positive tracking for legibility.

---

## 4. Responsive system

Mobile-first. Two breakpoints, both `min-width` (styles are added, never undone):

| Range | Layout |
|---|---|
| **< 768px** (mobile) | Single column. Sticky top bar with a hamburger. Sidebar is an off-canvas **drawer** over a scrim; body scroll locks while open. |
| **≥ 768px** (tablet) | Persistent sidebar column (`--adm-nav-w`), sticky full-height. Top bar and scrim hidden. Roomier padding. |
| **≥ 1280px** (desktop) | Wider sidebar (`264px`), generous main padding (`2.25rem 2.5rem`). |

Mechanics live in `.admin-shell` (CSS grid with named areas) and
`app/admin/(protected)/admin-shell.tsx` (the client component that toggles
`data-open` and manages the drawer). See §7 for the a11y wiring.

**Content-level responsiveness** doesn't depend on those breakpoints:
- `.metric-grid`, `.stat-cards` use `repeat(auto-fit, minmax(...))` — they reflow
  by available width, not by device.
- `.field-row`, `.row-actions`, `.tag-list`, `.quick-actions` use `flex-wrap`.
- `.data-table` and `.media-tabs` keep content from overflowing on narrow
  screens (tables via `min-width: 0` on `.admin-main`; tabs via `overflow-x`).

Use width-based reflow (`auto-fit` / `flex-wrap`) for content; reserve the
`768`/`1280` breakpoints for shell chrome.

---

## 5. Component vocabulary

Components are plain semantic classes — no utility soup, no CSS modules. Reuse
these before inventing new ones.

### Shell
`.admin-shell` · `.admin-topbar` · `.admin-topbar-brand` · `.admin-menu-btn` ·
`.admin-menu-icon` · `.admin-scrim` · `.admin-nav` · `.admin-brand` ·
`.admin-logout` · `.admin-user` · `.admin-main`

### Page scaffolding
- `.content-page` — column wrapper, `max-width: 680px`. Add `.wide` for `960px`.
- `.content-head` — title + sub-paragraph. Add `.row` for a title with a
  right-aligned action button (wraps on mobile).
- `.dashboard` — wider landing wrapper (`1100px`).
- `.dashboard-subhead` — uppercase eyebrow above a section.

### Cards
- `.metric-card` (in `.metric-grid`) — linked KPI tile: `.metric-value` +
  `.metric-label`. Hover lifts and strengthens the border.
- `.stat-card` (in `.stat-cards`) — static stat: `.stat-card-value` +
  `.stat-card-label`.

### Forms
- `.content-form` — vertical form. Add `.form-narrow` to cap at `480px`
  (replaces any inline `max-width`).
- `.field` — label + control stack. `.field.checkbox` for inline checkboxes.
- `.field-row` — horizontal group of `.field`s; wraps below ~140px each.
- `.field-group` + `legend` — a bordered fieldset.
- `.field-hint` — helper text under a control. `.field-code` — inline mono chip
  (e.g. the live `themes/<key>/` folder preview).
- Feedback: `.field-error` / `.form-error` (danger), `.form-ok` (success).
  Inputs with `aria-invalid="true"` get a danger border + danger focus ring
  automatically.

### Buttons & links
- **Primary:** `.btn-primary`, or a bare `button` inside `.content-form` /
  `.login-form` / `.admin-logout`. Accent fill, white text.
- **Secondary:** `.btn-secondary` — neutral, outlined.
- **Inline link buttons:** `.link-danger` (destructive), `.link-muted` (quiet).

### Data display
- `.data-table` — bordered, rounded table; header in `--adm-surface-2`, hover
  rows, `.row-sub` for secondary cell text, `.row-actions` for the action column.
- `.badge` + a modifier: `.badge-draft` / `.badge-published` / `.badge-archived`
  (status), `.badge-slot` (mono, theme file slots). Each pairs color **with**
  text, never color alone.
- `.tag-list` / `.tag-chip` / `.tag-add` — tag editor.
- `.block-editor` & friends — the project content-block editor.

### Feature areas
- Theme upload: `.theme-upload*`, `.theme-actions`.
- Media: `.media-tabs` / `.media-tab` (+ `.media-tab-active`), `.media-group`,
  `.media-asset-list` / `.media-asset-row`, `.media-thumb*`.

---

## 6. States & feedback

Every interactive element gives feedback on **hover**, **focus**, **active**,
**disabled**, and (where relevant) **invalid** / **pending**.

- **Hover:** surfaces shift to `--adm-surface-2` or `--adm-accent-tint`; cards
  lift `1px` and firm up their border.
- **Focus:** a single ring — `2px solid var(--adm-focus)`, `2px` offset — on
  every focusable control via `:focus-visible`. Invalid inputs swap the ring to
  `--adm-danger`. Don't remove outlines; restyle the token if needed.
- **Active nav:** `aria-current="page"` drives the tint background, accent text,
  and the inset left edge. This is set in `admin-shell.tsx`, not hand-applied.
- **Disabled:** `opacity: 0.55` + `cursor: default`. Forms disable submit until
  valid (see the create-theme form).
- **Pending:** buttons swap their label ("Creating…") while a server action runs.

---

## 7. Accessibility (WCAG 2.1 AA)

Baseline the admin holds to:

- **Keyboard:** all actions reachable and operable; visible focus on every
  control; the mobile drawer is a `<button>` with `aria-expanded` +
  `aria-controls` pointing at the nav.
- **Screen readers:** nav is a labelled `<nav aria-label>`; the active link
  carries `aria-current="page"`; field errors associate via `aria-describedby`
  and `aria-invalid`; server-side form errors live in an assertive
  `aria-live` region that's `hidden` until populated.
- **Color:** status is never conveyed by color alone — badges carry text, errors
  carry a message. Ink-on-surface pairings target ≥ 4.5:1 (≥ 3:1 for large
  headings) in both themes.
- **Motion:** `prefers-reduced-motion` disables the drawer transition.
- **Targets:** interactive controls use generous padding for comfortable tap
  sizes on touch.

When adding UI, keep this bar: label the control, associate its error, make sure
it's reachable and visibly focusable, and don't lean on color to carry meaning.

---

## 8. How to add an admin page

1. **Wrap** content in `.content-page` (or `.content-page.wide`). Open with a
   `.content-head` (`<h1>` + a one-line `<p>` saying what the page is for).
2. **Build with the vocabulary above.** Reach for an existing class before
   writing new CSS. New shared styles go in the admin block of `globals.css`,
   referencing tokens — never raw hex.
3. **Forms:** use `.content-form` + `.field` / `.field-row`. Surface server
   errors with `.form-error` in an `aria-live` region; mirror server validation
   client-side only for feedback (the server still validates — see
   `create-theme-form.tsx` for the reference pattern).
4. **Nav:** add the route to the `NAV` array in `admin-shell.tsx`. Active
   highlighting is automatic via `isActive()`.
5. **Check:** tab through it (focus visible everywhere?), shrink to 360px
   (does it reflow, not overflow?), toggle OS dark mode (still legible?), and
   confirm no status relies on color alone.

---

## 9. Reference files

| Concern | File |
|---|---|
| Tokens, all admin styles | `app/globals.css` (admin block) |
| Shell, drawer, active nav | `app/admin/(protected)/admin-shell.tsx` |
| Auth gate (server) | `app/admin/(protected)/layout.tsx` |
| Dashboard (metric cards) | `app/admin/(protected)/page.tsx` |
| Form pattern (validation + a11y) | `app/admin/(protected)/themes/create-theme-form.tsx` |
| Engagement (stat cards + table) | `app/admin/(protected)/engagement/page.tsx` |
| Login | `app/admin/login/` |

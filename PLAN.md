# PLAN.md — Portfolio CMS

## Current goal
Core CMS loop is WORKING: admin CRUDs content → public site renders it through
swappable themes with configurable sections, plus engagement tracking. Themes
can be built-in (repo) or uploaded from the admin. Remaining work is pre-deploy
hardening/polish, then the VPS deploy.

## Build order (phased)

### Phase 0 — Foundation ✅ DONE
- [x] Next.js 16 + TS strict + Tailwind project init
- [x] Local Postgres + Prisma 7 wired (prisma.config.ts; driver adapter @prisma/adapter-pg)
- [x] lib/db.ts singleton (Pool + PrismaPg adapter, cached on globalThis)
- [x] lib/env.ts — Zod-validated env; app fails fast on boot
- [x] schema.prisma migrated; seed script (profile + sample data)
- [x] Zod schemas for every JSONB field
- [x] middleware.ts host-split (admin. → /admin) — routing only

### Phase 1 — Auth + admin shell ✅ DONE
- [x] Single admin login (argon2id hash, SHA-256 session token, host-only cookie)
- [x] Hand-rolled sessions (Lucia pattern; Auth.js/Lucia-lib not used)
- [x] Protected /admin (protected) route group; requireAdmin boundary
- [x] Admin layout / nav; in-memory login rate-limit

### Phase 2 — Content CRUD ✅ DONE
- [x] Profile edit (bioVariants; media deferred to library) — Zod both ways
- [x] Projects CRUD (+ tags, status/featured/order, sanitized content blocks,
      PUBLISHED-only leak guard, URL auto-prepend, read-side resilience)
- [x] Skills CRUD
- [x] PlatformStats CRUD (manual values; unique platform+label)

### Phase 3 — Public rendering + multi-page themes ✅ DONE
- [x] liquidjs engine: app/lib/render-theme.ts
- [x] Public site as a ROUTE HANDLER app/(public)/[[...slug]]/route.ts
      (returns full theme HTML; avoids nested <html>; no layout split needed —
      this replaced the originally-planned page.tsx approach)
- [x] CSS/asset route app/themes/[key]/[file]/route.ts
- [x] THREE built-in theme folders: minimal, showcase, simple-basic
- [x] Per-project pages /projects/<slug> via project.html
- [x] Contact form handler app/api/contact/route.ts (ContactMessage model)
- [x] Active-theme switch from admin
- [x] Data shape matches PLACEHOLDER_CHEATSHEET.md; PUBLISHED only

### Phase 4 — Theme upload + section management ✅ DONE
- [x] "Create theme" in admin: create a named theme, upload its page files
      individually (layout/home/about/contact/project + style.css). Stored in
      THEME_UPLOAD_DIR (outside repo, survives redeploys). HTML validated as
      Liquid on upload. Engine resolves built-in vs uploaded by Theme.source.
- [x] showcase upgraded to a richer theme (proved data/presentation split)
- [x] Section management UI (enable/disable + reorder; home page honors it).
      Config editor deferred (config field exists, minimal/permissive for now).

### Phase 5 — Engagement ✅ DONE
- [x] Record profile/project views (fire-and-forget) + likes (cookie session,
      idempotent via unique index) — EngagementEvent
- [x] Aggregate stats in admin (/admin/engagement)

### Phase 6 — Pre-production (VPS) ⬜ NOT STARTED
- [ ] Provision Hostinger KVM 2; server hardening
- [ ] Install Node LTS, PM2, Nginx, Certbot, PostgreSQL 17
- [ ] DNS: A records @, www, admin → VPS IP; Certbot SSL on all three
- [ ] Nginx config (incl. x-middleware-subrequest strip)
- [ ] Deploy flow scripted (pull, npm ci, migrate deploy, build, reload)
- [ ] Off-server pg_dump backups + a TESTED restore
- [ ] Harden/scale audit, observability, rollback tested
- [ ] LAUNCH_CHECKLIST.md worked top to bottom

## Pre-deploy backlog (do before Phase 6 / launch)
- [ ] Real AUTH_SECRET in .env (openssl rand -base64 32) — still placeholder
- [ ] Contact form: rate-limiting + spam protection (handler has none yet)
- [ ] Media upload UI (library is seeded/rendered but no upload flow yet)
- [ ] Like button is a full-page POST/redirect (no JS) — optional JS polish
- [ ] Bot/crawler views inflate counts — optional filtering later
- [ ] Delete _removed_default_page.tsx.bak from project root (harmless)
- [ ] On VPS, set THEME_UPLOAD_DIR to a persistent writable path

## Architecture notes (how it was actually built)
- Themes: built-in folders in themes/<key>/ OR uploaded to THEME_UPLOAD_DIR;
  resolved by Theme.source via lib/themes/paths.ts. All rendered as sandboxed
  Liquid templates (no server-side code in themes).
- Public site is a route handler (not a React page) so themes own the full doc.
- Tests run against a SEPARATE database (portfolio_cms_test); never touches dev
  data. tests/setup/env.ts loads .env.test and refuses non-test DBs.
- JSONB only for render-only content; filterable/sortable data stays relational.

## Decisions settled
- Auth: hand-rolled sessions (Lucia pattern), not Auth.js/Lucia-lib.
- Theme upload: individual page files, stored on disk outside the repo,
  treated as Liquid templates (sandbox-safe).

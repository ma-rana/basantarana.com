# Portfolio CMS

A fully custom, data-driven CMS powering basantarana.com. All content (profile,
projects, skills, platform stats) is managed from a secure admin portal; the
public site renders the same data through swappable HTML themes.

Stack: Next.js 16 (App Router) + TypeScript · PostgreSQL 17 + Prisma 7 · Zod ·
Tailwind. One app serves the public site (`basantarana.com`) and admin
(`admin.basantarana.com`), split by hostname in `middleware.ts`.

## Local setup (Phase 0)

### 1. Install dependencies

```bash
npm install
```

### 2. Start a local Postgres (Docker)

```bash
docker run --name portfolio-pg \
  -e POSTGRES_USER=app_user \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=portfolio_cms \
  -p 5432:5432 \
  -d postgres:17
```

(Stop/remove later with `docker stop portfolio-pg && docker rm portfolio-pg`.)

### 3. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`. For the Docker container above, use:

```
DATABASE_URL="postgresql://app_user:devpassword@localhost:5432/portfolio_cms?schema=public"
AUTH_SECRET="<run: openssl rand -base64 32>"
```

`lib/env.ts` validates these on startup with Zod — the app refuses to boot if
any are missing or malformed.

### 4. Generate client, migrate, seed

```bash
npm run db:generate   # prisma generate -> app/generated/prisma
npm run db:migrate    # prisma migrate dev (creates the first migration)
npm run db:seed       # tsx scripts/seed.ts (sample data for local dev only)
```

The Prisma connection string lives in `prisma.config.ts` (the Prisma 7 way),
**not** in the schema's datasource block.

### 5. Run

```bash
npm run dev      # http://localhost:3000
npm test         # vitest: env + JSONB schema tests
```

For the admin host locally, map `admin.localhost` (or use a hosts-file entry)
and visit `http://admin.localhost:3000`.

## Project conventions

See `CLAUDE.md` for the full engineering rules. Key ones:

- Data/presentation separation: themes are folders of HTML + Liquid placeholders.
- Hybrid model: queryable fields are relational columns; render-only content is
  JSONB, and **every JSONB field has a Zod schema** validated on write and read.
- Prisma is a singleton (`lib/db.ts`).
- Middleware is routing only — real auth is re-checked in every protected route.

## Migrations

- Local: `npm run db:migrate` (`prisma migrate dev`).
- Production: `npm run db:deploy` (`prisma migrate deploy`) — never `dev`.

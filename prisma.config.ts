// prisma.config.ts — Prisma 7 configuration.
// The DATABASE_URL lives HERE (not in the schema's datasource block) — this is
// the Prisma 7 way. `import "dotenv/config"` loads .env so env() can read it.
// See CLAUDE.md rule: "Connection string in prisma.config.ts (NOT the
// datasource block)."

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` runs this. We also expose npm run db:seed for clarity.
    seed: "tsx scripts/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

// scripts/migrate-test-db.ts
//
// Applies the current migrations to the TEST database (portfolio_cms_test).
//
// Why a script: Prisma 7's CLI reads DATABASE_URL via prisma.config.ts, which
// loads .env (your DEV db). To migrate the TEST db instead, we load .env.test
// first, then run `prisma migrate deploy` with that DATABASE_URL in the
// environment. Cross-platform (no shell-specific env syntax).
//
// Run once after creating the portfolio_cms_test database, and again whenever
// you add a migration:
//   npm run db:migrate:test

import { config } from "dotenv";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.test");
if (!existsSync(envPath)) {
  console.error("Missing .env.test — copy .env.test.example to .env.test first.");
  process.exit(1);
}

const parsed = config({ path: envPath });
const url = parsed.parsed?.DATABASE_URL ?? "";
if (!url.includes("portfolio_cms_test")) {
  console.error(`Refusing: .env.test DATABASE_URL must point at portfolio_cms_test.\nGot: ${url}`);
  process.exit(1);
}

console.log("Applying migrations to the TEST database…");
execSync("prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
console.log("Test database is up to date.");

// tests/setup/env.ts — loads the TEST environment before any test runs.
//
// Tests must hit a SEPARATE database (portfolio_cms_test), never your dev/real
// data, because the suites call deleteMany() to clean up. We load .env.test
// here. This file is referenced from vitest.config.ts > setupFiles, which runs
// before each test file's imports (so lib/db gets the test DATABASE_URL when it
// builds the pg Pool).
//
// SAFETY: if .env.test is missing, we throw rather than silently fall back to
// .env — falling back would point tests at your real DB and wipe it. A loud
// failure is the safe failure here.

import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const testEnvPath = path.resolve(process.cwd(), ".env.test");

if (!existsSync(testEnvPath)) {
  throw new Error(
    "Missing .env.test — tests need a separate test database.\n" +
      "Copy .env.test.example to .env.test and point DATABASE_URL at " +
      "portfolio_cms_test (NOT your dev database). See README.",
  );
}

config({ path: testEnvPath });

// Belt-and-braces: refuse to run if the test DB URL looks like the dev DB.
// (A common foot-gun is copying .env verbatim and forgetting to change the name.)
const url = process.env.DATABASE_URL ?? "";
if (!/_test(\?|$)/.test(url) && !url.includes("portfolio_cms_test")) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL does not look like a test database.\n` +
      `Got: ${url}\n` +
      `It must point at portfolio_cms_test so tests never touch your real data.`,
  );
}

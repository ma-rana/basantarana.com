/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// Vitest config. setupFiles runs tests/setup/env.ts BEFORE any test file's
// imports, which loads .env.test (the SEPARATE test database) so DB-backed
// tests never touch your dev/real data. The setup file also refuses to run if
// DATABASE_URL doesn't look like a test DB — a safety guard against the wipe.
export default defineConfig({
  test: {
    setupFiles: ["./tests/setup/env.ts"],
    environment: "node",
  },
});

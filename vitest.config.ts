/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// Vitest config. The key job here is loading .env BEFORE any test file runs, so
// tests that import lib/db (which reads process.env.DATABASE_URL when it builds
// the pg Pool) get the connection string. Without this, DB-backed tests fail
// with "client password must be a string". setupFiles run before each test
// file's own imports are evaluated, so dotenv is loaded in time.
export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    // Pure-logic + DB tests share one process; keep them serial-friendly.
    environment: "node",
  },
});

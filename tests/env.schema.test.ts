// tests/env.schema.test.ts
// Proves the env schema rejects missing/invalid vars (the app should refuse to
// boot on bad config) and accepts a fully-valid environment.
//
// Vitest sets NODE_ENV=test, so importing lib/env does NOT run the boot-time
// loadEnv() — we test EnvSchema directly.

import { describe, it, expect } from "vitest";
import { EnvSchema } from "../lib/env";

const validEnv = {
  DATABASE_URL: "postgresql://app_user:pw@localhost:5432/portfolio_cms?schema=public",
  AUTH_SECRET: "a".repeat(32),
  APP_URL: "https://basantarana.com",
  ADMIN_URL: "https://admin.basantarana.com",
  ADMIN_COOKIE_DOMAIN: "admin.basantarana.com",
  NODE_ENV: "development",
};

describe("EnvSchema", () => {
  it("accepts a fully valid environment", () => {
    const parsed = EnvSchema.parse(validEnv);
    expect(parsed.APP_URL).toBe("https://basantarana.com");
  });

  it("rejects a missing required var (DATABASE_URL)", () => {
    const { DATABASE_URL, ...missing } = validEnv;
    void DATABASE_URL;
    expect(() => EnvSchema.parse(missing)).toThrow();
  });

  it("rejects an AUTH_SECRET shorter than 32 chars", () => {
    expect(() => EnvSchema.parse({ ...validEnv, AUTH_SECRET: "tooshort" })).toThrow();
  });

  it("rejects a non-URL DATABASE_URL", () => {
    expect(() => EnvSchema.parse({ ...validEnv, DATABASE_URL: "not-a-url" })).toThrow();
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => EnvSchema.parse({ ...validEnv, NODE_ENV: "staging" })).toThrow();
  });
});

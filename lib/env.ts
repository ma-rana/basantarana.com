// lib/env.ts — startup environment validation.
// Validates process.env against a Zod schema ONCE, at import time, so the app
// refuses to boot on missing/invalid config instead of failing mysteriously at
// runtime. Import `env` from here everywhere instead of touching process.env
// directly — one source of truth, validated, typed.
//
// Mirrors .env.example. Keep the two in sync.

import { z } from "zod";

export const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.url(),
  ADMIN_URL: z.url(),
  ADMIN_COOKIE_DOMAIN: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export type Env = z.infer<typeof EnvSchema>;

// parse() throws on boot if anything is missing/invalid. We surface a readable
// message rather than Zod's raw error dump so a misconfigured deploy is obvious.
function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${issues}\n` +
        `Check your .env against .env.example.`,
    );
  }
  return parsed.data;
}

// On import, validate immediately so the app refuses to boot on bad config.
// Skipped under the test runner (NODE_ENV=test) so unit tests can exercise the
// schema in isolation without a fully-populated environment. The boot path is
// still covered: any real dev/prod start runs loadEnv().
export const env: Env =
  process.env.NODE_ENV === "test" ? (process.env as unknown as Env) : loadEnv();

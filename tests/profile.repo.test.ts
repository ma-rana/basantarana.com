// tests/profile.repo.test.ts — Profile repo + input schema.
// DB-backed (needs Postgres + generated client), like the session tests.
// Cleans up the profile rows it touches.

import { describe, it, expect, afterAll } from "vitest";
import { db } from "../lib/db";
import { getProfile, upsertProfile } from "../lib/repos/profile";
import { ProfileInputSchema } from "../lib/schemas/profile";

const validInput = {
  name: "Test Person",
  headline: "Builder of things",
  email: "test@example.com",
  location: "Melbourne",
  bioVariants: { short: "Short.", medium: "Medium bio.", long: "Long bio." },
};

afterAll(async () => {
  // Remove any profile rows so the suite is repeatable. (Singleton table.)
  await db.profile.deleteMany();
});

describe("ProfileInputSchema", () => {
  it("accepts valid input and coerces empty optionals to null", () => {
    const parsed = ProfileInputSchema.parse({ ...validInput, email: "", location: "" });
    expect(parsed.email).toBeNull();
    expect(parsed.location).toBeNull();
  });

  it("rejects a missing name", () => {
    expect(() => ProfileInputSchema.parse({ ...validInput, name: "" })).toThrow();
  });

  it("rejects a short bio over 160 chars", () => {
    const bad = { ...validInput, bioVariants: { ...validInput.bioVariants, short: "x".repeat(161) } };
    expect(() => ProfileInputSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() => ProfileInputSchema.parse({ ...validInput, email: "not-an-email" })).toThrow();
  });
});

describe("profile repo", () => {
  it("creates then reads back the profile, with JSONB round-tripping", async () => {
    const input = ProfileInputSchema.parse(validInput);
    await upsertProfile(input);

    const got = await getProfile();
    expect(got).not.toBeNull();
    expect(got?.name).toBe("Test Person");
    expect(got?.bioVariants).toEqual(validInput.bioVariants); // JSONB round-trip
  });

  it("upsert updates the existing singleton rather than creating a second row", async () => {
    await upsertProfile(ProfileInputSchema.parse(validInput));
    await upsertProfile(ProfileInputSchema.parse({ ...validInput, name: "Renamed" }));

    const count = await db.profile.count();
    expect(count).toBe(1); // still one row
    expect((await getProfile())?.name).toBe("Renamed");
  });

  it("accepts bio variants exactly at their max lengths (edge)", async () => {
    const edge = {
      ...validInput,
      bioVariants: {
        short: "s".repeat(160),
        medium: "m".repeat(600),
        long: "l".repeat(4000),
      },
    };
    await upsertProfile(ProfileInputSchema.parse(edge));
    const got = await getProfile();
    expect(got?.bioVariants.short.length).toBe(160);
    expect(got?.bioVariants.long.length).toBe(4000);
  });
});

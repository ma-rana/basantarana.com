// tests/platform-stat.repo.test.ts — schema + repo, incl. the unique constraint.
// DB-backed parts need Postgres + generated client.

import { describe, it, expect, afterEach } from "vitest";
import { db } from "../lib/db";
import { PlatformStatInputSchema } from "../lib/schemas/platform-stat";
import {
  createPlatformStat,
  updatePlatformStat,
  deletePlatformStat,
  getPlatformStatById,
  listPlatformStats,
} from "../lib/repos/platform-stat";

const base = { platform: "github", label: "Followers", value: 120, order: 1 };

afterEach(async () => {
  await db.platformStat.deleteMany();
});

describe("platform stat schema", () => {
  it("accepts valid input", () => {
    expect(PlatformStatInputSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty platform", () => {
    expect(PlatformStatInputSchema.safeParse({ ...base, platform: "" }).success).toBe(false);
  });
  it("rejects a negative value", () => {
    expect(PlatformStatInputSchema.safeParse({ ...base, value: -5 }).success).toBe(false);
  });
  it("rejects a non-integer value", () => {
    expect(PlatformStatInputSchema.safeParse({ ...base, value: 1.5 }).success).toBe(false);
  });
});

describe("platform stat repo", () => {
  it("creates and reads back a stat", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(base));
    if ("kind" in created) throw new Error("create failed");
    const got = await getPlatformStatById(created.id);
    expect(got?.platform).toBe("github");
    expect(got?.value).toBe(120);
  });

  it("rejects a duplicate platform+label with the sentinel", async () => {
    await createPlatformStat(PlatformStatInputSchema.parse(base));
    const dup = await createPlatformStat(PlatformStatInputSchema.parse(base));
    expect("kind" in dup && dup.kind).toBe("duplicate");
  });

  it("allows the same platform with a different label", async () => {
    await createPlatformStat(PlatformStatInputSchema.parse(base));
    const other = await createPlatformStat(
      PlatformStatInputSchema.parse({ ...base, label: "Stars" }),
    );
    expect("kind" in other).toBe(false); // not a duplicate
  });

  it("updates a stat's value", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(base));
    if ("kind" in created) throw new Error("create failed");
    const updated = await updatePlatformStat(
      created.id,
      PlatformStatInputSchema.parse({ ...base, value: 200 }),
    );
    expect(updated && "value" in updated && updated.value).toBe(200);
  });

  it("update returns null for a missing stat", async () => {
    const r = await updatePlatformStat("nope", PlatformStatInputSchema.parse(base));
    expect(r).toBeNull();
  });

  it("deletes a stat", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(base));
    if ("kind" in created) throw new Error("create failed");
    await deletePlatformStat(created.id);
    expect(await getPlatformStatById(created.id)).toBeNull();
  });
});

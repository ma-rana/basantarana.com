// tests/skill.repo.test.ts — Skill schema + repo. DB-backed parts need Postgres.

import { describe, it, expect, afterEach } from "vitest";
import { db } from "../lib/db";
import { SkillInputSchema } from "../lib/schemas/skill";
import { createSkill, updateSkill, deleteSkill, getSkillById, listSkills } from "../lib/repos/skill";

const base = { name: "TypeScript", category: "Languages", level: 85, order: 1 };

afterEach(async () => {
  await db.skill.deleteMany();
});

describe("skill schema", () => {
  it("accepts valid input", () => {
    expect(SkillInputSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty name", () => {
    expect(SkillInputSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });
  it("rejects level above 100", () => {
    expect(SkillInputSchema.safeParse({ ...base, level: 101 }).success).toBe(false);
  });
  it("rejects level below 0", () => {
    expect(SkillInputSchema.safeParse({ ...base, level: -1 }).success).toBe(false);
  });
  it("rejects a non-integer level", () => {
    expect(SkillInputSchema.safeParse({ ...base, level: 50.5 }).success).toBe(false);
  });
});

describe("skill repo", () => {
  it("creates and reads back a skill", async () => {
    const created = await createSkill(SkillInputSchema.parse(base));
    const got = await getSkillById(created.id);
    expect(got?.name).toBe("TypeScript");
    expect(got?.level).toBe(85);
  });

  it("updates a skill", async () => {
    const created = await createSkill(SkillInputSchema.parse(base));
    const updated = await updateSkill(created.id, SkillInputSchema.parse({ ...base, level: 90 }));
    expect(updated?.level).toBe(90);
  });

  it("update returns null for a missing skill", async () => {
    const r = await updateSkill("nonexistent-id", SkillInputSchema.parse(base));
    expect(r).toBeNull();
  });

  it("lists skills ordered by category then order", async () => {
    await createSkill(SkillInputSchema.parse({ name: "B", category: "Zeta", level: 1, order: 1 }));
    await createSkill(SkillInputSchema.parse({ name: "A", category: "Alpha", level: 1, order: 2 }));
    const list = await listSkills();
    expect(list[0].category).toBe("Alpha"); // Alpha sorts before Zeta
  });

  it("deletes a skill", async () => {
    const created = await createSkill(SkillInputSchema.parse(base));
    await deleteSkill(created.id);
    expect(await getSkillById(created.id)).toBeNull();
  });
});

// lib/repos/skill.ts — Skill data layer. Flat columns, no JSONB to validate.

import { db } from "../db";
import type { SkillInput } from "../schemas/skill";

export type Skill = {
  id: string;
  name: string;
  category: string;
  level: number;
  order: number;
};

export async function listSkills(): Promise<Skill[]> {
  return db.skill.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });
}

export async function getSkillById(id: string): Promise<Skill | null> {
  return db.skill.findUnique({ where: { id } });
}

export async function createSkill(input: SkillInput): Promise<Skill> {
  return db.skill.create({ data: input });
}

export async function updateSkill(id: string, input: SkillInput): Promise<Skill | null> {
  const existing = await db.skill.findUnique({ where: { id } });
  if (!existing) return null;
  return db.skill.update({ where: { id }, data: input });
}

export async function deleteSkill(id: string): Promise<void> {
  await db.skill.delete({ where: { id } }).catch(() => {});
}

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

// Persist an explicit order from a drag-to-reorder, scoped to ONE category.
// Skills are grouped by category on the public site and ordered within each
// group, so a drag only rearranges same-category skills. `orderedIds` is that
// category's skills in their new order; each gets its index as `order`. Ids that
// aren't in the given category are ignored.
export async function reorderSkills(category: string, orderedIds: string[]): Promise<void> {
  const group = await db.skill.findMany({
    where: { category },
    select: { id: true, order: true },
  });
  const currentOrder = new Map(group.map((s) => [s.id, s.order]));

  const writes = orderedIds
    .filter((id) => currentOrder.has(id))
    .map((id, i) => ({ id, newOrder: i }))
    .filter((s) => currentOrder.get(s.id) !== s.newOrder)
    .map((s) => db.skill.update({ where: { id: s.id }, data: { order: s.newOrder } }));

  if (writes.length) await db.$transaction(writes);
}

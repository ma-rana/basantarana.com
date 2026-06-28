"use client";

// app/admin/(protected)/skills/skills-list.tsx — client wrapper that renders one
// DragList per category. Skills reorder WITHIN their category (the public site
// groups them that way), so each category is its own independent drag zone and
// saves with its category bound into the reorder action.

import Link from "next/link";
import { DragList, type DragItem } from "../drag-list";
import { reorderSkillsAction, deleteSkillAction } from "./actions";
import type { Skill } from "../../../../lib/repos/skill";

export function SkillsList({ skills }: { skills: Skill[] }) {
  // Group skills by category, preserving the server's order within each group.
  const groups = new Map<string, Skill[]>();
  for (const s of skills) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }

  function itemsFor(group: Skill[]): DragItem[] {
    return group.map((s) => ({
      id: s.id,
      primary: <Link href={`/admin/skills/${s.id}`}>{s.name}</Link>,
      meta: <span className="drag-value">Level {s.level}</span>,
      actions: (
        <>
          <Link href={`/admin/skills/${s.id}`} className="btn-ghost btn-sm">Edit</Link>
          <form action={deleteSkillAction}>
            <input type="hidden" name="id" value={s.id} />
            <button type="submit" className="btn-danger btn-sm">Delete</button>
          </form>
        </>
      ),
    }));
  }

  return (
    <div className="skills-groups">
      {[...groups.entries()].map(([category, group]) => (
        <section key={category} className="skills-group">
          <h2 className="skills-group-title">{category}</h2>
          <DragList
            items={itemsFor(group)}
            ariaLabel={`${category} skills — drag to reorder`}
            onReorder={(orderedIds) => reorderSkillsAction(category, orderedIds)}
          />
        </section>
      ))}
    </div>
  );
}

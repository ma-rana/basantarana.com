"use client";

// app/admin/(protected)/projects/projects-list.tsx — client wrapper that maps
// projects into the reusable DragList. Reorder saves on drop; Edit/Delete keep
// their existing behavior.

import Link from "next/link";
import { DragList, type DragItem } from "../drag-list";
import { reorderProjectsAction, deleteProjectAction } from "./actions";
import type { Project } from "../../../../lib/repos/project";

export function ProjectsList({ projects }: { projects: Project[] }) {
  const items: DragItem[] = projects.map((p) => ({
    id: p.id,
    primary: <Link href={`/admin/projects/${p.id}`}>{p.title}</Link>,
    secondary: `/${p.slug}`,
    meta: (
      <>
        <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
        {p.featured ? <span className="drag-flag" title="Featured">★ Featured</span> : null}
      </>
    ),
    actions: (
      <>
        <Link href={`/admin/projects/${p.id}`} className="btn-ghost btn-sm">Edit</Link>
        <form action={deleteProjectAction}>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className="btn-danger btn-sm">Delete</button>
        </form>
      </>
    ),
  }));

  return (
    <DragList
      items={items}
      ariaLabel="Projects — drag to reorder"
      onReorder={reorderProjectsAction}
    />
  );
}

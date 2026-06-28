"use client";

// app/admin/(protected)/stats/stats-list.tsx — client wrapper mapping platform
// stats into the reusable DragList. Reorder saves on drop.

import Link from "next/link";
import { DragList, type DragItem } from "../drag-list";
import { reorderStatsAction, deleteStatAction } from "./actions";
import type { PlatformStat } from "../../../../lib/repos/platform-stat";

export function StatsList({ stats }: { stats: PlatformStat[] }) {
  const items: DragItem[] = stats.map((s) => ({
    id: s.id,
    primary: <Link href={`/admin/stats/${s.id}`}>{s.platform}</Link>,
    secondary: s.label,
    meta: <span className="drag-value">{s.value.toLocaleString()}</span>,
    actions: (
      <>
        <Link href={`/admin/stats/${s.id}`} className="btn-ghost btn-sm">Edit</Link>
        <form action={deleteStatAction}>
          <input type="hidden" name="id" value={s.id} />
          <button type="submit" className="btn-danger btn-sm">Delete</button>
        </form>
      </>
    ),
  }));

  return (
    <DragList
      items={items}
      ariaLabel="Platform stats — drag to reorder"
      onReorder={reorderStatsAction}
    />
  );
}

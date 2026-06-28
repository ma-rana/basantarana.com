// app/admin/(protected)/stats/page.tsx — platform stats list.

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listPlatformStats } from "../../../../lib/repos/platform-stat";
import { StatsList } from "./stats-list";

export const metadata = { title: "Platform stats · Admin" };

export default async function StatsPage() {
  await requireAdmin();
  const stats = await listPlatformStats();

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>Platform stats</h1>
          <p>Manual figures for now (YouTube, GitHub, etc.). Drag to reorder.</p>
        </div>
        <Link className="btn-primary" href="/admin/stats/new">New stat</Link>
      </header>

      {stats.length === 0 ? (
        <p className="muted">No stats yet. Add your first one.</p>
      ) : (
        <StatsList stats={stats} />
      )}
    </section>
  );
}

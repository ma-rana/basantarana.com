// app/admin/(protected)/stats/page.tsx — platform stats list.

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listPlatformStats } from "../../../../lib/repos/platform-stat";
import { deleteStatAction } from "./actions";

export const metadata = { title: "Platform stats · Admin" };

export default async function StatsPage() {
  await requireAdmin();
  const stats = await listPlatformStats();

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>Platform stats</h1>
          <p>Manual figures for now (YouTube, GitHub, etc.).</p>
        </div>
        <Link className="btn-primary" href="/admin/stats/new">New stat</Link>
      </header>

      {stats.length === 0 ? (
        <p className="muted">No stats yet. Add your first one.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Platform</th><th>Label</th><th>Value</th><th>Order</th><th></th></tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/admin/stats/${s.id}`}>{s.platform}</Link></td>
                <td>{s.label}</td>
                <td>{s.value.toLocaleString()}</td>
                <td>{s.order}</td>
                <td className="row-actions">
                  <Link href={`/admin/stats/${s.id}`}>Edit</Link>
                  <form action={deleteStatAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="link-danger">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// app/admin/(protected)/projects/page.tsx — projects list (server component).

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listProjects } from "../../../../lib/repos/project";
import { deleteProjectAction } from "./actions";

export const metadata = { title: "Projects · Admin" };

export default async function ProjectsPage() {
  await requireAdmin();
  const projects = await listProjects();

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>Projects</h1>
          <p>Everything you&apos;ve built. Drafts stay private until published.</p>
        </div>
        <Link className="btn-primary" href="/admin/projects/new">New project</Link>
      </header>

      {projects.length === 0 ? (
        <p className="muted">No projects yet. Create your first one.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Featured</th><th>Order</th><th></th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/projects/${p.id}`}>{p.title}</Link>
                  <span className="row-sub">/{p.slug}</span>
                </td>
                <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                <td>{p.featured ? "★" : "—"}</td>
                <td>{p.order}</td>
                <td className="row-actions">
                  <Link href={`/admin/projects/${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                  <form action={deleteProjectAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="btn-danger btn-sm">Delete</button>
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

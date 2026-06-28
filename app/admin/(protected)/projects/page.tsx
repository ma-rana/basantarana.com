// app/admin/(protected)/projects/page.tsx — projects list (server component).

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listProjects } from "../../../../lib/repos/project";
import { ProjectsList } from "./projects-list";

export const metadata = { title: "Projects · Admin" };

export default async function ProjectsPage() {
  await requireAdmin();
  const projects = await listProjects();

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>Projects</h1>
          <p>Everything you&apos;ve built. Drag to reorder; drafts stay private until published.</p>
        </div>
        <Link className="btn-primary" href="/admin/projects/new">New project</Link>
      </header>

      {projects.length === 0 ? (
        <p className="muted">No projects yet. Create your first one.</p>
      ) : (
        <ProjectsList projects={projects} />
      )}
    </section>
  );
}

// app/admin/(protected)/projects/[id]/page.tsx — edit a project.
// Binds the project id to updateProjectAction so the shared form (which expects
// a (prev, formData) action) can call it.

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { getProjectById } from "../../../../../lib/repos/project";
import { ProjectForm } from "../project-form";
import { updateProjectAction } from "../actions";

export const metadata = { title: "Edit project · Admin" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const action = updateProjectAction.bind(null, id);

  return (
    <section className="content-page project-page">
      <header className="content-head row">
        <div>
          <h1>Edit project</h1>
          <p className="row-sub">{project.title}</p>
        </div>
        <Link href="/admin/projects" className="btn-back">All projects</Link>
      </header>
      <ProjectForm action={action} project={project} submitLabel="Save changes" />
    </section>
  );
}

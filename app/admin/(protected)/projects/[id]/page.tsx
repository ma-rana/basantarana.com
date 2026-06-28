// app/admin/(protected)/projects/[id]/page.tsx — edit a project.
// Binds the project id to updateProjectAction so the shared form (which expects
// a (prev, formData) action) can call it.

import { notFound } from "next/navigation";
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
    <section className="content-page">
      <header className="content-head">
        <h1>Edit project</h1>
      </header>
      <ProjectForm action={action} project={project} submitLabel="Save changes" />
    </section>
  );
}

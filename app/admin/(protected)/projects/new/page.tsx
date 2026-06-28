// app/admin/(protected)/projects/new/page.tsx — create a project.

import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { ProjectForm } from "../project-form";
import { createProjectAction } from "../actions";

export const metadata = { title: "New project · Admin" };

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <section className="content-page">
      <header className="content-head">
        <h1>New project</h1>
      </header>
      <ProjectForm action={createProjectAction} submitLabel="Create project" />
    </section>
  );
}

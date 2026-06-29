// app/admin/(protected)/projects/new/page.tsx — create a project.

import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { ProjectForm } from "../project-form";
import { createProjectAction } from "../actions";

export const metadata = { title: "New project · Admin" };

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <section className="content-page project-page">
      <header className="content-head">
        <h1>New project</h1>
        <p>Add a project to your portfolio. Save as a draft to keep it private.</p>
      </header>
      <ProjectForm action={createProjectAction} submitLabel="Create project" />
    </section>
  );
}

// app/admin/(protected)/skills/page.tsx — skills list.

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listSkills } from "../../../../lib/repos/skill";
import { SkillsList } from "./skills-list";

export const metadata = { title: "Skills · Admin" };

export default async function SkillsPage() {
  await requireAdmin();
  const skills = await listSkills();

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>Skills</h1>
          <p>Grouped by category on the public site. Drag to reorder within a category.</p>
        </div>
        <Link className="btn-primary" href="/admin/skills/new">New skill</Link>
      </header>

      {skills.length === 0 ? (
        <p className="muted">No skills yet. Add your first one.</p>
      ) : (
        <SkillsList skills={skills} />
      )}
    </section>
  );
}

// app/admin/(protected)/skills/page.tsx — skills list.

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listSkills } from "../../../../lib/repos/skill";
import { deleteSkillAction } from "./actions";

export const metadata = { title: "Skills · Admin" };

export default async function SkillsPage() {
  await requireAdmin();
  const skills = await listSkills();

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>Skills</h1>
          <p>Grouped by category on the public site.</p>
        </div>
        <Link className="btn-primary" href="/admin/skills/new">New skill</Link>
      </header>

      {skills.length === 0 ? (
        <p className="muted">No skills yet. Add your first one.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Level</th><th>Order</th><th></th></tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/admin/skills/${s.id}`}>{s.name}</Link></td>
                <td>{s.category}</td>
                <td>{s.level}</td>
                <td>{s.order}</td>
                <td className="row-actions">
                  <Link href={`/admin/skills/${s.id}`}>Edit</Link>
                  <form action={deleteSkillAction}>
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

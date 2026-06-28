// app/admin/(protected)/skills/new/page.tsx — create a skill.

import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { SkillForm } from "../skill-form";
import { createSkillAction } from "../actions";

export const metadata = { title: "New skill · Admin" };

export default async function NewSkillPage() {
  await requireAdmin();
  return (
    <section className="content-page">
      <header className="content-head"><h1>New skill</h1></header>
      <SkillForm action={createSkillAction} submitLabel="Create skill" />
    </section>
  );
}

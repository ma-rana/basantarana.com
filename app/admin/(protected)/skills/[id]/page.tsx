// app/admin/(protected)/skills/[id]/page.tsx — edit a skill.

import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { getSkillById } from "../../../../../lib/repos/skill";
import { SkillForm } from "../skill-form";
import { updateSkillAction } from "../actions";

export const metadata = { title: "Edit skill · Admin" };

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const skill = await getSkillById(id);
  if (!skill) notFound();

  const action = updateSkillAction.bind(null, id);

  return (
    <section className="content-page">
      <header className="content-head"><h1>Edit skill</h1></header>
      <SkillForm action={action} skill={skill} submitLabel="Save changes" />
    </section>
  );
}

// app/admin/(protected)/stats/[id]/page.tsx — edit a platform stat.

import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { getPlatformStatById } from "../../../../../lib/repos/platform-stat";
import { StatForm } from "../stat-form";
import { updateStatAction } from "../actions";

export const metadata = { title: "Edit stat · Admin" };

export default async function EditStatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const stat = await getPlatformStatById(id);
  if (!stat) notFound();

  const action = updateStatAction.bind(null, id);

  return (
    <section className="content-page">
      <header className="content-head"><h1>Edit stat</h1></header>
      <StatForm action={action} stat={stat} submitLabel="Save changes" />
    </section>
  );
}

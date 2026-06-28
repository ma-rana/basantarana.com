// app/admin/(protected)/stats/new/page.tsx — create a platform stat.

import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { StatForm } from "../stat-form";
import { createStatAction } from "../actions";

export const metadata = { title: "New stat · Admin" };

export default async function NewStatPage() {
  await requireAdmin();
  return (
    <section className="content-page">
      <header className="content-head"><h1>New stat</h1></header>
      <StatForm action={createStatAction} submitLabel="Create stat" />
    </section>
  );
}

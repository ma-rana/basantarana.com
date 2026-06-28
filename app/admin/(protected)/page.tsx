// app/admin/(protected)/page.tsx — dashboard (served at /admin).
// Behind the (protected) gate. requireAdmin() also re-runs here so the page
// has the user even though the layout already checked — defense in depth and
// it gives us the user object directly.

import { requireAdmin } from "../../../lib/auth/require-admin";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAdmin();

  return (
    <section className="dashboard">
      <h1>Dashboard</h1>
      <p>Signed in as {user.email}.</p>
      <p className="dashboard-empty">
        Content management arrives in the next phase. For now, this confirms the
        admin area is gated and your session is live.
      </p>
    </section>
  );
}

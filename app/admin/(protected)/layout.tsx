// app/admin/(protected)/layout.tsx — the auth GATE for all protected admin pages.
//
// This calls requireAdmin() on EVERY request to any page under (protected).
// This is the real authorization boundary — middleware only routed the host.
// The login page lives OUTSIDE this group (app/admin/login), so it stays
// reachable when logged out (no redirect loop).
//
// (protected) is a route group: the parentheses mean it does NOT add a URL
// segment. So app/admin/(protected)/page.tsx is served at /admin, not
// /admin/protected.

import { requireAdmin } from "../../../lib/auth/require-admin";
import { logoutAction } from "../actions";
import Link from "next/link";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin(); // redirects to /admin/login if not authed

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-brand">Portfolio CMS</div>
        <nav>
          <Link href="/admin">Dashboard</Link>
        </nav>
        <form action={logoutAction} className="admin-logout">
          <span className="admin-user">{user.email}</span>
          <button type="submit">Sign out</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

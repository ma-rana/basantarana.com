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
//
// Presentation + responsive nav live in AdminShell (client). This file stays a
// server component so the auth check runs on the server before anything renders.

import { requireAdmin } from "../../../lib/auth/require-admin";
import { countUnreadMessages } from "../../../lib/repos/contact";
import { logoutAction } from "../actions";
import { AdminShell } from "./admin-shell";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin(); // redirects to /admin/login if not authed
  const unreadMessages = await countUnreadMessages();

  return (
    <AdminShell
      userEmail={user.email}
      logoutAction={logoutAction}
      unreadMessages={unreadMessages}
    >
      {children}
    </AdminShell>
  );
}

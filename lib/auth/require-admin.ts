// lib/auth/require-admin.ts — the real authorization boundary.
//
// Middleware only ROUTED the admin host (CVE-2025-29927: middleware is not an
// auth boundary). EVERY protected surface re-checks the session itself by
// calling requireAdmin(): the admin layout, and every Server Action / Route
// Handler that mutates or reads admin data. Re-verified on each request.

import { redirect } from "next/navigation";
import { getCurrentSession } from "./cookies";
import type { User } from "../../app/generated/prisma/client";

// Returns the authenticated admin user, or redirects to login. Call at the top
// of the admin layout and at the start of every admin server action.
export async function requireAdmin(): Promise<User> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/admin/login");
  }
  // Role gate: only ADMIN/EDITOR may reach admin surfaces. (Both allowed for
  // now; tighten per-action later if EDITOR needs fewer powers.)
  if (user.role !== "ADMIN" && user.role !== "EDITOR") {
    redirect("/admin/login");
  }
  return user;
}

// app/admin/login/page.tsx — login screen (server component).
// If already authenticated, skip straight to the dashboard.

import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/auth/cookies";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/admin");

  return (
    <main className="login-screen">
      <div className="login-card">
        <h1>Admin</h1>
        <p className="login-sub">Sign in to manage your site.</p>
        <LoginForm />
      </div>
    </main>
  );
}

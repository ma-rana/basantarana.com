// app/admin/(protected)/profile/page.tsx — Profile editor (server component).
// Behind the (protected) auth gate. Loads the singleton profile through the
// repo (JSONB validated on read) and hands it to the client form.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { getProfile } from "../../../../lib/repos/profile";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile · Admin" };

export default async function ProfilePage() {
  await requireAdmin();
  const profile = await getProfile();

  return (
    <section className="content-page">
      <header className="content-head">
        <h1>Profile</h1>
        <p>Your core details and bio. Shown across the public site.</p>
      </header>
      <ProfileForm profile={profile} />
    </section>
  );
}

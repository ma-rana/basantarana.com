"use server";

// app/admin/(protected)/profile/actions.ts — Profile update server action.
// requireAdmin() first (re-checked here, not via middleware). Input re-validated
// server-side with Zod. Writes go through the repo, which validates JSONB too.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { ProfileInputSchema } from "../../../../lib/schemas/profile";
import { upsertProfile } from "../../../../lib/repos/profile";

export type ProfileFormState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  await requireAdmin(); // authorization boundary — every action re-checks

  const parsed = ProfileInputSchema.safeParse({
    name: formData.get("name"),
    headline: formData.get("headline"),
    email: formData.get("email") ?? "",
    location: formData.get("location") ?? "",
    bioVariants: {
      short: formData.get("bioShort") ?? "",
      medium: formData.get("bioMedium") ?? "",
      long: formData.get("bioLong") ?? "",
    },
  });

  if (!parsed.success) {
    // Surface the first message per field so the form can show them inline.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  try {
    await upsertProfile(parsed.data);
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  revalidatePath("/admin/profile");
  return { ok: true, error: null };
}

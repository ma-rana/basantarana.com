"use client";

// app/admin/(protected)/profile/profile-form.tsx
// Client form for editing the singleton profile. useActionState surfaces
// success + per-field errors from the server action. Client validation here is
// UX only; the action re-validates with Zod.

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "./actions";
import type { Profile } from "../../../../lib/repos/profile";

const initial: ProfileFormState = { ok: false, error: null };

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);
  const fe = state.fieldErrors ?? {};
  const bio = profile?.bioVariants;

  return (
    <form action={formAction} className="content-form">
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={profile?.name ?? ""} required maxLength={120} />
        {fe["name"] ? <em className="field-error">{fe["name"]}</em> : null}
      </label>

      <label className="field">
        <span>Headline</span>
        <input name="headline" defaultValue={profile?.headline ?? ""} required maxLength={200} />
        {fe["headline"] ? <em className="field-error">{fe["headline"]}</em> : null}
      </label>

      <label className="field">
        <span>Email <small>(optional)</small></span>
        <input name="email" type="email" defaultValue={profile?.email ?? ""} />
        {fe["email"] ? <em className="field-error">{fe["email"]}</em> : null}
      </label>

      <label className="field">
        <span>Location <small>(optional)</small></span>
        <input name="location" defaultValue={profile?.location ?? ""} maxLength={120} />
        {fe["location"] ? <em className="field-error">{fe["location"]}</em> : null}
      </label>

      <fieldset className="field-group">
        <legend>Bio variants</legend>

        <label className="field">
          <span>Short <small>(≤160 chars — cards, meta)</small></span>
          <textarea name="bioShort" rows={2} defaultValue={bio?.short ?? ""} maxLength={160} />
          {fe["bioVariants.short"] ? <em className="field-error">{fe["bioVariants.short"]}</em> : null}
        </label>

        <label className="field">
          <span>Medium <small>(≤600 chars)</small></span>
          <textarea name="bioMedium" rows={4} defaultValue={bio?.medium ?? ""} maxLength={600} />
          {fe["bioVariants.medium"] ? <em className="field-error">{fe["bioVariants.medium"]}</em> : null}
        </label>

        <label className="field">
          <span>Long <small>(≤4000 chars — about page)</small></span>
          <textarea name="bioLong" rows={8} defaultValue={bio?.long ?? ""} maxLength={4000} />
          {fe["bioVariants.long"] ? <em className="field-error">{fe["bioVariants.long"]}</em> : null}
        </label>
      </fieldset>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}

      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

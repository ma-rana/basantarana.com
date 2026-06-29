"use client";

// app/admin/(protected)/profile/profile-form.tsx
// Client form for editing the singleton profile. useActionState surfaces
// success + per-field errors from the server action. Client validation here is
// UX only; the action re-validates with Zod.
//
// Layout: two grouped panels (Identity, Bio variants). The bio fields show a
// live character counter against their limit, since that's the only soft
// guidance the writer has (the field hard-stops at maxLength otherwise).

import { useActionState, useState } from "react";
import { updateProfileAction, type ProfileFormState } from "./actions";
import type { Profile } from "../../../../lib/repos/profile";

const initial: ProfileFormState = { ok: false, error: null };

// A textarea that tracks its length and shows "n / max", turning amber as it
// approaches the limit. Controlled only for the counter; value still posts via
// the name attribute.
function CountedTextarea({
  name,
  label,
  hint,
  rows,
  max,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  hint: string;
  rows: number;
  max: number;
  defaultValue: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const near = value.length >= max * 0.9;

  return (
    <label className="field">
      <span className="field-label-row">
        <span>
          {label} <small>{hint}</small>
        </span>
        <span className={`char-count${near ? " is-near" : ""}`} aria-hidden="true">
          {value.length} / {max}
        </span>
      </span>
      <textarea
        name={name}
        rows={rows}
        maxLength={max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  );
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);
  const fe = state.fieldErrors ?? {};
  const bio = profile?.bioVariants;

  return (
    <form action={formAction} className="content-form profile-form">
      <fieldset className="field-group">
        <legend>Identity</legend>

        <div className="field-row">
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
        </div>

        <div className="field-row">
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
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Bio variants</legend>
        <p className="field-group-note">
          Three lengths of the same story. Themes pick whichever fits — short for
          cards and meta tags, long for the about page.
        </p>

        <CountedTextarea
          name="bioShort"
          label="Short"
          hint="(cards, meta)"
          rows={2}
          max={160}
          defaultValue={bio?.short ?? ""}
          error={fe["bioVariants.short"]}
        />
        <CountedTextarea
          name="bioMedium"
          label="Medium"
          hint="(intro sections)"
          rows={4}
          max={600}
          defaultValue={bio?.medium ?? ""}
          error={fe["bioVariants.medium"]}
        />
        <CountedTextarea
          name="bioLong"
          label="Long"
          hint="(about page)"
          rows={8}
          max={4000}
          defaultValue={bio?.long ?? ""}
          error={fe["bioVariants.long"]}
        />
      </fieldset>

      <div className="form-footer">
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}
      </div>
    </form>
  );
}

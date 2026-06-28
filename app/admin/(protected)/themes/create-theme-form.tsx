"use client";

// Create-theme form (uploaded themes). On success the action redirects to the
// new theme's file-management page.

import { useActionState } from "react";
import { createThemeAction, type CreateThemeState } from "./actions";

const initial: CreateThemeState = { error: null };

export function CreateThemeForm() {
  const [state, formAction, pending] = useActionState(createThemeAction, initial);

  return (
    <form action={formAction} className="content-form" style={{ maxWidth: 480 }}>
      <div className="field-row">
        <label className="field">
          <span>Key <small>(lowercase, hyphens — becomes the folder name)</small></span>
          <input name="key" required maxLength={40} placeholder="my-theme" />
        </label>
        <label className="field">
          <span>Display name</span>
          <input name="name" required maxLength={80} placeholder="My Theme" />
        </label>
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create theme"}</button>
    </form>
  );
}

"use client";

// app/admin/(protected)/stats/stat-form.tsx — shared create/edit form.

import { useActionState } from "react";
import type { StatFormState } from "./actions";
import type { PlatformStat } from "../../../../lib/repos/platform-stat";

const initial: StatFormState = { ok: false, error: null };

type Action = (prev: StatFormState, fd: FormData) => Promise<StatFormState>;

export function StatForm({
  action,
  stat,
  submitLabel,
}: {
  action: Action;
  stat?: PlatformStat;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="content-form">
      <label className="field">
        <span>Platform <small>(e.g. github, youtube, linkedin)</small></span>
        <input name="platform" defaultValue={stat?.platform ?? ""} required maxLength={40} />
        {fe["platform"] ? <em className="field-error">{fe["platform"]}</em> : null}
      </label>

      <label className="field">
        <span>Label <small>(e.g. Followers, Subscribers)</small></span>
        <input name="label" defaultValue={stat?.label ?? ""} required maxLength={60} />
        {fe["label"] ? <em className="field-error">{fe["label"]}</em> : null}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Value</span>
          <input name="value" type="number" min={0} defaultValue={stat?.value ?? 0} />
          {fe["value"] ? <em className="field-error">{fe["value"]}</em> : null}
        </label>
      </div>

      {/* Order is managed with the up/down buttons on the stats list, not here.
          Preserve the current value so saves don't reset position. */}
      <input type="hidden" name="order" defaultValue={stat?.order ?? 0} />

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}

      <button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}

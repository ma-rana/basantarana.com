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
          <span>Value <small>(used when no API URL is set, and as fallback)</small></span>
          <input name="value" type="number" min={0} defaultValue={stat?.value ?? 0} />
          {fe["value"] ? <em className="field-error">{fe["value"]}</em> : null}
        </label>
      </div>

      {/* Optional live-stat config. Leave both blank for a manual stat. When set,
          a scheduled job fetches apiUrl, reads the number at apiPath, and shows
          that instead of Value. apiUrl may contain an API key — it's stored
          server-side and never shown on the public site. */}
      <fieldset className="field-group">
        <legend>Live value (optional)</legend>
        <p className="field-hint">
          Fetch this number from an API instead of typing it. Leave blank to keep
          it manual. Refreshed on a schedule; the public site shows the last
          fetched number (falling back to Value if a fetch fails).
        </p>

        <label className="field">
          <span>API URL <small>(http/https; may include a key)</small></span>
          <input
            name="apiUrl"
            type="text"
            defaultValue={stat?.apiUrl ?? ""}
            maxLength={500}
            placeholder="https://api.github.com/users/USERNAME"
          />
          {fe["apiUrl"] ? <em className="field-error">{fe["apiUrl"]}</em> : null}
        </label>

        <label className="field">
          <span>JSON path <small>(where the number lives in the response)</small></span>
          <input
            name="apiPath"
            type="text"
            defaultValue={stat?.apiPath ?? ""}
            maxLength={200}
            placeholder="followers"
          />
          {fe["apiPath"] ? <em className="field-error">{fe["apiPath"]}</em> : null}
        </label>

        <p className="field-hint">
          Examples — GitHub followers: URL <code>https://api.github.com/users/NAME</code>,
          path <code>followers</code>. YouTube subs: URL{" "}
          <code>https://www.googleapis.com/youtube/v3/channels?part=statistics&amp;id=CHANNEL&amp;key=KEY</code>,
          path <code>items.0.statistics.subscriberCount</code>.
        </p>

        {stat?.fetchedAt ? (
          <p className="field-hint">
            Last fetched: {new Date(stat.fetchedAt).toLocaleString()}
            {stat.cachedValue != null ? ` — value ${stat.cachedValue.toLocaleString()}` : ""}
          </p>
        ) : null}
      </fieldset>

      {/* Order is managed with the up/down buttons on the stats list, not here.
          Preserve the current value so saves don't reset position. */}
      <input type="hidden" name="order" defaultValue={stat?.order ?? 0} />

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}

      <button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}

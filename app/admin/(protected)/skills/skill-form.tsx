"use client";

// app/admin/(protected)/skills/skill-form.tsx — shared create/edit form.

import { useActionState } from "react";
import type { SkillFormState } from "./actions";
import type { Skill } from "../../../../lib/repos/skill";

const initial: SkillFormState = { ok: false, error: null };

type Action = (prev: SkillFormState, fd: FormData) => Promise<SkillFormState>;

export function SkillForm({
  action,
  skill,
  submitLabel,
}: {
  action: Action;
  skill?: Skill;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="content-form">
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={skill?.name ?? ""} required maxLength={80} />
        {fe["name"] ? <em className="field-error">{fe["name"]}</em> : null}
      </label>

      <label className="field">
        <span>Category <small>(e.g. Frontend, Backend, Languages)</small></span>
        <input name="category" defaultValue={skill?.category ?? ""} required maxLength={60} />
        {fe["category"] ? <em className="field-error">{fe["category"]}</em> : null}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Level <small>(0–100)</small></span>
          <input name="level" type="number" min={0} max={100} defaultValue={skill?.level ?? 0} />
          {fe["level"] ? <em className="field-error">{fe["level"]}</em> : null}
        </label>
        <label className="field">
          <span>Order</span>
          <input name="order" type="number" min={0} defaultValue={skill?.order ?? 0} />
          {fe["order"] ? <em className="field-error">{fe["order"]}</em> : null}
        </label>
      </div>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}

      <button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}

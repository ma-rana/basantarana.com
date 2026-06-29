"use client";

// app/admin/(protected)/media/link-add-form.tsx
// Add-a-link form for the Links tab. Unlike media (which uploads files), a link
// is typed in: a URL + a label. Validated server-side by LinkInputSchema; the
// URL tolerates a missing scheme ("github.com/me" -> "https://github.com/me").

import { useActionState, useEffect, useRef } from "react";
import { addLinkAction, type AddLinkState } from "./link-actions";

const initial: AddLinkState = { ok: false, error: null };

export function LinkAddForm() {
  const [state, formAction, pending] = useActionState(addLinkAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs after a successful add so the next link starts fresh.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="link-add-form">
      <div className="link-add-fields">
        <label className="field link-add-url">
          <span>URL</span>
          <input
            name="url"
            type="text"
            required
            maxLength={500}
            placeholder="github.com/yourname"
          />
        </label>
        <label className="field link-add-label">
          <span>Label</span>
          <input
            name="label"
            type="text"
            required
            maxLength={80}
            placeholder="My GitHub"
          />
        </label>
        <label className="field link-add-key">
          <span>Key <small>(optional)</small></span>
          <input
            name="key"
            type="text"
            maxLength={40}
            placeholder="github"
          />
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add link"}
        </button>
      </div>
      <p className="link-add-hint">
        A <strong>key</strong> makes a named placeholder for themes:{" "}
        <code>github</code> → <code>{"{{ profile.link_github }}"}</code> (and{" "}
        <code>{"{{ profile.link_github_label }}"}</code>). Leave it blank for a
        plain link you reference by slot instead.
      </p>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="form-ok" role="status">Link added.</p> : null}
    </form>
  );
}

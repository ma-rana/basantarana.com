"use client";

// Create-theme form (uploaded themes). On success the action redirects to the
// new theme's file-management page.
//
// UX/a11y notes:
// - Live client-side validation MIRRORS the server Zod rules (lib/schemas/theme)
//   purely for fast feedback. The server still re-validates — this never gates
//   security, only smooths the interaction.
// - The key field normalizes as you type (lowercase, hyphenated) so what you see
//   is what the server will store, and previews the resulting folder name.
// - Errors are associated to their inputs via aria-describedby + aria-invalid,
//   and the server error renders in an assertive live region for screen readers.

import { useActionState, useId, useState } from "react";
import { createThemeAction, type CreateThemeState } from "./actions";

const initial: CreateThemeState = { error: null };

// Mirror of CreateThemeSchema (lib/schemas/theme.ts). Kept in lockstep so the
// inline hints match what the action accepts.
const KEY_PATTERN = /^[a-z0-9-]+$/;

function validateKey(value: string): string | null {
  if (value.length === 0) return null; // don't nag on empty until submit
  if (value.length < 2) return "Key must be at least 2 characters.";
  if (value.length > 40) return "Key must be 40 characters or fewer.";
  if (!KEY_PATTERN.test(value)) return "Use lowercase letters, numbers, and hyphens only.";
  return null;
}

// Normalize keystrokes toward a valid key: lowercase, spaces/underscores -> "-",
// strip anything else, and collapse repeated hyphens. Non-destructive enough
// that typing feels natural while staying inside the allowed character set.
function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");
}

export function CreateThemeForm() {
  const [state, formAction, pending] = useActionState(createThemeAction, initial);

  const keyId = useId();
  const keyHintId = useId();
  const keyErrId = useId();
  const nameId = useId();
  const serverErrId = useId();

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  const keyError = keyTouched ? validateKey(key) : null;
  const keyValid = key.length >= 2 && validateKey(key) === null;
  const canSubmit = keyValid && name.trim().length > 0 && !pending;

  return (
    <form action={formAction} className="content-form form-narrow" noValidate>
      <div className="field-row">
        <label className="field" htmlFor={keyId}>
          <span>Key</span>
          <input
            id={keyId}
            name="key"
            required
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
            placeholder="my-theme"
            value={key}
            aria-invalid={keyError ? true : undefined}
            aria-describedby={keyError ? `${keyHintId} ${keyErrId}` : keyHintId}
            onChange={(e) => setKey(normalizeKey(e.target.value))}
            onBlur={() => setKeyTouched(true)}
          />
          <small id={keyHintId} className="field-hint">
            {key.length >= 2 ? (
              <>Folder: <code className="field-code">themes/{key}/</code></>
            ) : (
              "Lowercase letters, numbers and hyphens — becomes the folder name."
            )}
          </small>
          {keyError ? (
            <small id={keyErrId} className="field-error" role="alert">
              {keyError}
            </small>
          ) : null}
        </label>

        <label className="field" htmlFor={nameId}>
          <span>Display name</span>
          <input
            id={nameId}
            name="name"
            required
            maxLength={80}
            placeholder="My Theme"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>

      {/* Assertive live region: empty until the server returns an error. */}
      <p
        id={serverErrId}
        className="form-error"
        role="alert"
        aria-live="assertive"
        hidden={!state.error}
      >
        {state.error}
      </p>

      <button type="submit" disabled={!canSubmit}>
        {pending ? "Creating…" : "Create theme"}
      </button>
    </form>
  );
}

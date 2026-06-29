"use client";

// app/admin/(protected)/themes/[key]/expected-files-editor.tsx
//
// Per-theme "expected files" checklist editor. The author declares which files
// THIS theme is meant to have. Three kinds of entry:
//   - fixed engine files (home/about/contact/project/layout.html, style.css)
//   - custom pages: any <slug>.html auto-routes at /<slug> (skills.html → /skills)
//   - tracking-only: other names (blog.css, an include partial) the engine
//     doesn't route on its own — a personal reminder.
// Each row shows whether the file is actually uploaded (present/missing),
// computed on the server and passed in.
//
// The list is held in React state and saved as JSON via a server action. The
// present flags reflect the last server render; a brand-new row shows "missing"
// until the file is uploaded and the page reloads.

import { useActionState, useMemo, useState } from "react";
import {
  saveExpectedFilesAction,
  type ExpectedFilesState,
} from "../actions";
import type { ExpectedFileStatus, ExpectedFileKind } from "../../../../../lib/repos/theme";

const initial: ExpectedFilesState = { ok: false, error: null };

// The fixed files the engine reads, offered as one-tap "add" chips with
// sensible default labels. layout.html is intentionally NOT offered here: it's
// an advanced, optional shared wrapper, and basic themes keep their full markup
// in each page (home.html etc.). It can still be typed manually if wanted.
const ENGINE_FILES: { name: string; label: string }[] = [
  { name: "home.html", label: "Landing page" },
  { name: "about.html", label: "About page" },
  { name: "contact.html", label: "Contact page" },
  { name: "project.html", label: "Project detail page" },
  { name: "style.css", label: "Stylesheet" },
];

// Reserved slugs a custom page can't use (mirrors the server's RESERVED list).
const RESERVED_SLUGS = new Set([
  "home", "about", "contact", "project", "projects", "layout", "style",
]);
// The fixed filenames the engine reads. Derived from the suggested chips PLUS
// layout.html, which is a real fixed file even though it isn't suggested (an
// advanced optional wrapper). Used to classify a row as "fixed".
const FIXED_NAMES = new Set([...ENGINE_FILES.map((e) => e.name), "layout.html"]);
// Public route for each fixed page file (mirrors the server's FIXED_ROUTES).
// layout.html and style.css aren't pages, so they have no route.
const FIXED_ROUTES: Record<string, string | null> = {
  "home.html": "/",
  "about.html": "/about",
  "contact.html": "/contact",
  "project.html": "/projects/…",
  "layout.html": null,
  "style.css": null,
};
const CUSTOM_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Classify a filename client-side so a freshly-added row shows the right state
// immediately (before the next server round-trip). Mirrors the server's
// classifyExpectedFile, including the public route for fixed + custom pages.
function classify(name: string): { kind: ExpectedFileKind; routePath: string | null } {
  if (FIXED_NAMES.has(name)) return { kind: "fixed", routePath: FIXED_ROUTES[name] ?? null };
  if (name.endsWith(".html")) {
    const slug = name.slice(0, -".html".length);
    if (CUSTOM_SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug)) {
      return { kind: "page", routePath: `/${slug}` };
    }
  }
  return { kind: "tracking", routePath: null };
}

type Row = { name: string; label: string };

const NAME_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;

export function ExpectedFilesEditor({
  themeKey,
  initialStatus,
}: {
  themeKey: string;
  // Server-computed status for the theme's current expected list.
  initialStatus: ExpectedFileStatus[];
}) {
  const [state, formAction, pending] = useActionState(saveExpectedFilesAction, initial);

  // Seed editable rows from the server status (name + label only; present and
  // kind are display facts recomputed on reload / classified client-side).
  const [rows, setRows] = useState<Row[]>(
    initialStatus.map((s) => ({ name: s.name, label: s.label })),
  );
  const [nameDraft, setNameDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Quick lookup of present facts by name, from the last server render.
  const presentByName = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const s of initialStatus) m.set(s.name, s.present);
    return m;
  }, [initialStatus]);

  const takenNames = useMemo(
    () => new Set(rows.map((r) => r.name.toLowerCase())),
    [rows],
  );

  function addRow(name: string, label: string) {
    const clean = name.trim();
    if (!clean) {
      setLocalError("Enter a filename.");
      return;
    }
    if (!NAME_RE.test(clean)) {
      setLocalError("Use a simple filename like home.html or style.css.");
      return;
    }
    if (takenNames.has(clean.toLowerCase())) {
      setLocalError(`${clean} is already in the list.`);
      return;
    }
    setRows((rs) => [...rs, { name: clean, label: label.trim() }]);
    setNameDraft("");
    setLabelDraft("");
    setLocalError(null);
  }

  function removeRow(name: string) {
    setRows((rs) => rs.filter((r) => r.name !== name));
  }

  function updateLabel(name: string, label: string) {
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, label } : r)));
  }

  // Engine files not yet in the list, for the quick-add chip row.
  const remainingEngine = ENGINE_FILES.filter((e) => !takenNames.has(e.name.toLowerCase()));

  return (
    <form action={formAction} className="content-form expected-editor">
      <input type="hidden" name="key" value={themeKey} />
      <input type="hidden" name="expected" value={JSON.stringify(rows)} />

      {rows.length === 0 ? (
        <p className="muted expected-empty">
          No files declared yet. Add the files this theme is meant to include —
          start with the standard ones below or type a custom name.
        </p>
      ) : (
        <ul className="expected-list">
          {rows.map((r) => {
            const present = presentByName.get(r.name) ?? false;
            const { kind, routePath } = classify(r.name);
            return (
              <li key={r.name} className="expected-row" data-present={present}>
                <span
                  className={`expected-dot${present ? " is-present" : ""}`}
                  aria-hidden="true"
                />
                <span className="expected-main">
                  <code className="expected-name">{r.name}</code>
                  <input
                    className="expected-label-input"
                    value={r.label}
                    onChange={(e) => updateLabel(r.name, e.target.value)}
                    placeholder="What is this file? (optional)"
                    maxLength={60}
                    aria-label={`Label for ${r.name}`}
                  />
                </span>
                <span className="expected-flags">
                  {routePath ? (
                    <span className="badge badge-published expected-routebadge" title={`Serves at ${routePath}`}>
                      {routePath}
                    </span>
                  ) : kind === "tracking" ? (
                    <span className="badge badge-slot expected-trackonly" title="The engine doesn't route this file on its own — tracked here for your reference only.">
                      Tracking only
                    </span>
                  ) : null}
                  <span className="expected-state">{present ? "Uploaded" : "Missing"}</span>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => removeRow(r.name)}
                    aria-label={`Remove ${r.name}`}
                  >
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {remainingEngine.length > 0 ? (
        <div className="expected-quickadd">
          <span className="expected-quickadd-label">Add standard file</span>
          <div className="expected-quickadd-chips">
            {remainingEngine.map((e) => (
              <button
                key={e.name}
                type="button"
                className="block-add-btn"
                title={e.label}
                onClick={() => addRow(e.name, e.label)}
              >
                + {e.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="expected-add">
        <input
          className="expected-add-name"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addRow(nameDraft, labelDraft);
            }
          }}
          placeholder="skills.html"
          maxLength={60}
          aria-label="Custom filename"
        />
        <input
          className="expected-add-label"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addRow(nameDraft, labelDraft);
            }
          }}
          placeholder="Label (optional)"
          maxLength={60}
          aria-label="Custom file label"
        />
        <button type="button" className="btn-secondary" onClick={() => addRow(nameDraft, labelDraft)}>
          Add
        </button>
      </div>
      <p className="expected-add-hint">
        Tip: a custom <code>name.html</code> becomes a live page at{" "}
        <code>/name</code> (e.g. <code>skills.html</code> → <code>/skills</code>).
        Other files (like <code>blog.css</code>) are tracked for reference only.
      </p>

      {localError ? <p className="form-error" role="alert">{localError}</p> : null}

      <div className="form-footer expected-footer">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save checklist"}
        </button>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.ok ? <p className="form-ok" role="status">Checklist saved.</p> : null}
      </div>
    </form>
  );
}

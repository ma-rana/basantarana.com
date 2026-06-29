"use client";

// app/admin/(protected)/projects/project-form.tsx
// Shared create/edit form. The content-block editor manages an array of typed
// blocks in React state and serializes it (plus tags) into hidden inputs on
// submit. Client validation is UX only; the server action re-validates with Zod
// and the repo sanitizes HTML.
//
// Layout: grouped panels (Details, Publishing, Tags, Content). The content
// editor renders each block as a labeled card with a position index and inline
// reorder/remove controls; new blocks come from a typed "add" palette.

import { useActionState, useState } from "react";
import type { ProjectFormState } from "./actions";
import type { Project, ProjectStatus } from "../../../../lib/repos/project";
import type { ContentBlock } from "../../../../lib/schemas/project";
import { slugify } from "../../../../lib/schemas/project";

const initial: ProjectFormState = { ok: false, error: null };

type Action = (prev: ProjectFormState, fd: FormData) => Promise<ProjectFormState>;

const BLOCK_TYPES: ContentBlock["type"][] = ["heading", "text", "code", "image", "embed"];

// Friendly label + one-line description per block type, for the add palette and
// the block card header.
const BLOCK_META: Record<ContentBlock["type"], { label: string; blurb: string }> = {
  heading: { label: "Heading", blurb: "A section title (H2 or H3)" },
  text: { label: "Text", blurb: "A paragraph; basic HTML allowed" },
  code: { label: "Code", blurb: "A formatted code snippet" },
  image: { label: "Image", blurb: "An image by URL with alt text" },
  embed: { label: "Embed", blurb: "An embedded URL (video, etc.)" },
};

// The three publishing states, shown as a segmented control. Each carries a
// one-line meaning and a status key that maps to the badge colors used elsewhere.
const STATUS_OPTIONS: { value: ProjectStatus; label: string; blurb: string }[] = [
  { value: "DRAFT", label: "Draft", blurb: "Private — only you can see it" },
  { value: "PUBLISHED", label: "Published", blurb: "Live on the public site" },
  { value: "ARCHIVED", label: "Archived", blurb: "Hidden, but kept on file" },
];

function emptyBlock(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "heading": return { type, text: "", level: 2 };
    case "text": return { type, html: "" };
    case "code": return { type, code: "", language: "" };
    case "image": return { type, url: "", alt: "" };
    case "embed": return { type, url: "" };
  }
}

export function ProjectForm({
  action,
  project,
  submitLabel,
}: {
  action: Action;
  project?: Project;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const fe = state.fieldErrors ?? {};

  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "DRAFT");
  const [featured, setFeatured] = useState(project?.featured ?? false);
  const [summary, setSummary] = useState(project?.summary ?? "");
  const [tags, setTags] = useState<string[]>(project?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>(project?.content ?? []);

  function addTag() {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }
  function updateBlock(i: number, patch: Partial<ContentBlock>) {
    setBlocks((bs) => bs.map((b, j) => (j === i ? ({ ...b, ...patch } as ContentBlock) : b)));
  }
  function move(i: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const summaryNear = summary.length >= 400 * 0.9;

  return (
    <form action={formAction} className="content-form project-form">
      {/* serialized complex fields */}
      <input type="hidden" name="content" value={JSON.stringify(blocks)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      {/* Order is managed with drag-to-reorder on the projects list, not here.
          Preserve the current value so saves don't reset position. */}
      <input type="hidden" name="order" defaultValue={project?.order ?? 0} />

      <fieldset className="field-group">
        <legend>Details</legend>

        <label className="field">
          <span>Title</span>
          <input
            name="title"
            defaultValue={project?.title ?? ""}
            required
            maxLength={200}
            placeholder="Project name"
            onChange={(e) => { if (!slugTouched) setSlug(slugify(e.target.value)); }}
          />
          {fe["title"] ? <em className="field-error">{fe["title"]}</em> : null}
        </label>

        <label className="field">
          <span>Slug <small>(the URL path)</small></span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
            required
            maxLength={120}
            placeholder="project-name"
          />
          <small className="field-hint">
            Public URL: <code className="field-code">/projects/{slug || "…"}</code>
          </small>
          {fe["slug"] ? <em className="field-error">{fe["slug"]}</em> : null}
        </label>

        <label className="field">
          <span className="field-label-row">
            <span>Summary <small>(shown on cards)</small></span>
            <span className={`char-count${summaryNear ? " is-near" : ""}`} aria-hidden="true">
              {summary.length} / 400
            </span>
          </span>
          <textarea
            name="summary"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            maxLength={400}
            placeholder="A short description of the project."
          />
          {fe["summary"] ? <em className="field-error">{fe["summary"]}</em> : null}
        </label>
      </fieldset>

      <fieldset className="field-group">
        <legend>Publishing</legend>

        {/* Status posts via a hidden input; the segmented control drives it. */}
        <input type="hidden" name="status" value={status} />
        <div className="field">
          <span>Status</span>
          <div className="segmented" role="radiogroup" aria-label="Status">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={status === opt.value}
                className={`segmented-option status-${opt.value.toLowerCase()}${status === opt.value ? " is-active" : ""}`}
                onClick={() => setStatus(opt.value)}
              >
                <span className="segmented-dot" aria-hidden="true" />
                <span className="segmented-text">
                  <span className="segmented-label">{opt.label}</span>
                  <span className="segmented-blurb">{opt.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured toggle card. The native checkbox is visually hidden and
            driven by the labeled row; value still posts via name="featured". */}
        <label className={`toggle-card${featured ? " is-on" : ""}`}>
          <span className="toggle-card-text">
            <span className="toggle-card-label">Featured</span>
            <span className="toggle-card-blurb">Pin this project to the top of the list, on the admin and public site.</span>
          </span>
          <input
            type="checkbox"
            name="featured"
            className="toggle-card-input"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          <span className="toggle-switch" aria-hidden="true" />
        </label>
      </fieldset>

      <fieldset className="field-group">
        <legend>Tags</legend>
        {tags.length > 0 ? (
          <div className="tag-list">
            {tags.map((t) => (
              <span key={t} className="tag-chip">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="muted tags-empty">No tags yet.</p>
        )}
        <div className="tag-add">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add a tag and press Enter"
            maxLength={40}
          />
          <button type="button" className="btn-secondary" onClick={addTag}>Add tag</button>
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Content</legend>
        <p className="field-group-note">
          The body of the project page, built from blocks. Drag isn&apos;t available
          here yet — use the arrows to reorder.
        </p>

        {blocks.length === 0 ? (
          <p className="muted blocks-empty">No blocks yet. Add one from the palette below.</p>
        ) : (
          <div className="blocks">
            {blocks.map((b, i) => (
              <div key={i} className="block-editor">
                <div className="block-head">
                  <span className="block-title">
                    <span className="block-index">{i + 1}</span>
                    {BLOCK_META[b.type].label}
                  </span>
                  <div className="block-controls">
                    <button type="button" className="btn-icon btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move block up">↑</button>
                    <button type="button" className="btn-icon btn-sm" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move block down">↓</button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} aria-label="Remove block">Remove</button>
                  </div>
                </div>

                {b.type === "heading" && (
                  <div className="block-fields">
                    <input value={b.text} placeholder="Heading text" onChange={(e) => updateBlock(i, { text: e.target.value })} />
                    <select value={b.level} onChange={(e) => updateBlock(i, { level: Number(e.target.value) as 2 | 3 })} aria-label="Heading level">
                      <option value={2}>H2 — section</option>
                      <option value={3}>H3 — subsection</option>
                    </select>
                  </div>
                )}
                {b.type === "text" && (
                  <textarea rows={4} value={b.html} placeholder="Text (basic HTML allowed; sanitized on save)" onChange={(e) => updateBlock(i, { html: e.target.value })} />
                )}
                {b.type === "code" && (
                  <div className="block-fields">
                    <input value={b.language} placeholder="Language (e.g. ts, python)" onChange={(e) => updateBlock(i, { language: e.target.value })} />
                    <textarea rows={5} value={b.code} placeholder="Paste your code here" className="block-code" onChange={(e) => updateBlock(i, { code: e.target.value })} />
                  </div>
                )}
                {b.type === "image" && (
                  <div className="block-fields">
                    <input value={b.url} placeholder="Image URL (https://…)" onChange={(e) => updateBlock(i, { url: e.target.value })} />
                    <input value={b.alt} placeholder="Alt text (describe the image)" onChange={(e) => updateBlock(i, { alt: e.target.value })} />
                  </div>
                )}
                {b.type === "embed" && (
                  <input value={b.url} placeholder="Embed URL (https://…)" onChange={(e) => updateBlock(i, { url: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="block-palette">
          <span className="block-palette-label">Add block</span>
          <div className="block-add">
            {BLOCK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className="block-add-btn"
                title={BLOCK_META[t].blurb}
                onClick={() => setBlocks([...blocks, emptyBlock(t)])}
              >
                + {BLOCK_META[t].label}
              </button>
            ))}
          </div>
        </div>
        {fe["content"] ? <em className="field-error">{fe["content"]}</em> : null}
      </fieldset>

      <div className="form-footer">
        <button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}
      </div>
    </form>
  );
}

"use client";

// app/admin/(protected)/projects/project-form.tsx
// Shared create/edit form. The content-block editor manages an array of typed
// blocks in React state and serializes it (plus tags) into hidden inputs on
// submit. Client validation is UX only; the server action re-validates with Zod
// and the repo sanitizes HTML.

import { useActionState, useState } from "react";
import type { ProjectFormState } from "./actions";
import type { Project, ProjectStatus } from "../../../../lib/repos/project";
import type { ContentBlock } from "../../../../lib/schemas/project";
import { slugify } from "../../../../lib/schemas/project";

const initial: ProjectFormState = { ok: false, error: null };

type Action = (prev: ProjectFormState, fd: FormData) => Promise<ProjectFormState>;

const BLOCK_TYPES: ContentBlock["type"][] = ["heading", "text", "code", "image", "embed"];

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

  return (
    <form action={formAction} className="content-form">
      {/* serialized complex fields */}
      <input type="hidden" name="content" value={JSON.stringify(blocks)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />

      <label className="field">
        <span>Title</span>
        <input
          name="title"
          defaultValue={project?.title ?? ""}
          required
          maxLength={200}
          onChange={(e) => { if (!slugTouched) setSlug(slugify(e.target.value)); }}
        />
        {fe["title"] ? <em className="field-error">{fe["title"]}</em> : null}
      </label>

      <label className="field">
        <span>Slug</span>
        <input
          name="slug"
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          required
          maxLength={120}
        />
        {fe["slug"] ? <em className="field-error">{fe["slug"]}</em> : null}
      </label>

      <label className="field">
        <span>Summary <small>(≤400 chars)</small></span>
        <textarea name="summary" rows={2} defaultValue={project?.summary ?? ""} required maxLength={400} />
        {fe["summary"] ? <em className="field-error">{fe["summary"]}</em> : null}
      </label>

      <div className="field-row">
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={(project?.status ?? "DRAFT") as ProjectStatus}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="field checkbox">
          <input name="featured" type="checkbox" defaultChecked={project?.featured ?? false} />
          <span>Featured</span>
        </label>
      </div>

      {/* Order is managed with the up/down buttons on the projects list, not
          here. Preserve the current value so saves don't reset position. */}
      <input type="hidden" name="order" defaultValue={project?.order ?? 0} />

      <fieldset className="field-group">
        <legend>Tags</legend>
        <div className="tag-list">
          {tags.map((t) => (
            <span key={t} className="tag-chip">
              {t}
              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button>
            </span>
          ))}
        </div>
        <div className="tag-add">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add a tag and press Enter"
            maxLength={40}
          />
          <button type="button" onClick={addTag}>Add</button>
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Content blocks</legend>
        {blocks.length === 0 ? <p className="muted">No blocks yet. Add one below.</p> : null}

        {blocks.map((b, i) => (
          <div key={i} className="block-editor">
            <div className="block-head">
              <strong>{b.type}</strong>
              <div className="block-controls">
                <button type="button" className="btn-icon btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className="btn-icon btn-sm" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} aria-label="Remove block">Remove</button>
              </div>
            </div>

            {b.type === "heading" && (
              <>
                <input value={b.text} placeholder="Heading text" onChange={(e) => updateBlock(i, { text: e.target.value })} />
                <select value={b.level} onChange={(e) => updateBlock(i, { level: Number(e.target.value) as 2 | 3 })}>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                </select>
              </>
            )}
            {b.type === "text" && (
              <textarea rows={4} value={b.html} placeholder="Text (basic HTML allowed; sanitized on save)" onChange={(e) => updateBlock(i, { html: e.target.value })} />
            )}
            {b.type === "code" && (
              <>
                <input value={b.language} placeholder="Language (e.g. ts)" onChange={(e) => updateBlock(i, { language: e.target.value })} />
                <textarea rows={5} value={b.code} placeholder="Code" onChange={(e) => updateBlock(i, { code: e.target.value })} />
              </>
            )}
            {b.type === "image" && (
              <>
                <input value={b.url} placeholder="Image URL (https://…)" onChange={(e) => updateBlock(i, { url: e.target.value })} />
                <input value={b.alt} placeholder="Alt text" onChange={(e) => updateBlock(i, { alt: e.target.value })} />
              </>
            )}
            {b.type === "embed" && (
              <input value={b.url} placeholder="Embed URL (https://…)" onChange={(e) => updateBlock(i, { url: e.target.value })} />
            )}
          </div>
        ))}

        <div className="block-add">
          {BLOCK_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setBlocks([...blocks, emptyBlock(t)])}>+ {t}</button>
          ))}
        </div>
        {fe["content"] ? <em className="field-error">{fe["content"]}</em> : null}
      </fieldset>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="form-ok" role="status">Saved.</p> : null}

      <button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}

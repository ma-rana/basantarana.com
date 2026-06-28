"use client";

// Single multi-file theme uploader. The admin picks one or more files at once;
// the server routes each by filename (the six named files + images). Shows what
// landed, what was rejected, and the deletable list of files already uploaded.
//
// The at-a-glance file checklist lives on the page (server-rendered); this
// component owns the drop zone, the upload result feedback, and per-file delete.

import { useActionState, useState } from "react";
import { uploadThemeFilesAction, deleteThemeFileAction, type UploadFilesState } from "../actions";
import { ALLOWED_UPLOAD_HINT } from "../../../../../lib/themes/paths";
import type { ThemeFile } from "../../../../../lib/themes/paths";

const initial: UploadFilesState = { saved: [], rejected: [], error: null };

export function ThemeUpload({
  themeKey,
  uploadedFiles,
  status,
  imageFiles,
}: {
  themeKey: string;
  uploadedFiles: string[];
  status?: Record<ThemeFile, boolean>;
  imageFiles?: string[];
}) {
  const [state, formAction, pending] = useActionState(uploadThemeFilesAction, initial);
  const [pickedCount, setPickedCount] = useState(0);

  return (
    <div className="theme-upload">
      <form action={formAction} className="theme-upload-form">
        <input type="hidden" name="key" value={themeKey} />
        <label className="theme-upload-drop">
          <input
            type="file"
            name="uploads"
            multiple
            accept=".html,.css,.png,.jpg,.jpeg,.svg,.webp,.ico"
            onChange={(e) => setPickedCount(e.target.files?.length ?? 0)}
          />
          <span className="theme-upload-icon" aria-hidden="true">↥</span>
          <span className="theme-upload-prompt">
            {pickedCount > 0
              ? `${pickedCount} file${pickedCount === 1 ? "" : "s"} ready to upload`
              : "Choose theme files"}
          </span>
          <span className="theme-upload-sub">{ALLOWED_UPLOAD_HINT}</span>
        </label>
        <button type="submit" disabled={pending || pickedCount === 0} className="btn-primary">
          {pending ? "Uploading…" : "Upload"}
        </button>
      </form>

      {state.error ? (
        <p className="form-error" role="alert">{state.error}</p>
      ) : null}

      {state.saved.length > 0 ? (
        <p className="form-ok" role="status">Uploaded: {state.saved.join(", ")}</p>
      ) : null}

      {state.rejected.length > 0 ? (
        <ul className="theme-upload-rejected" role="alert">
          {state.rejected.map((r) => (
            <li key={r.name}><code>{r.name}</code> — {r.reason}</li>
          ))}
        </ul>
      ) : null}

      {uploadedFiles.length > 0 ? (
        <div className="theme-files">
          <span className="theme-files-label">Uploaded files</span>
          <ul className="theme-files-list">
            {uploadedFiles.map((f) => (
              <li key={f} className="theme-files-item">
                <code>{f}</code>
                <form action={deleteThemeFileAction} className="theme-file-delete">
                  <input type="hidden" name="key" value={themeKey} />
                  <input type="hidden" name="filename" value={f} />
                  <button type="submit" className="btn-danger btn-sm" aria-label={`Delete ${f}`}>
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted theme-upload-empty">No files uploaded yet.</p>
      )}
    </div>
  );
}

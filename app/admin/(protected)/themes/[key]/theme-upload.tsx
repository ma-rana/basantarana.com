"use client";

// Single multi-file theme uploader. The admin picks one or more files at once;
// the server routes each by filename (the six named files + images). Shows what
// landed, what was rejected, and a one-line hint of recognized names.

import { useActionState } from "react";
import { uploadThemeFilesAction, deleteThemeFileAction, type UploadFilesState } from "../actions";
import { ALLOWED_UPLOAD_HINT } from "../../../../../lib/themes/paths";

const initial: UploadFilesState = { saved: [], rejected: [], error: null };

export function ThemeUpload({
  themeKey,
  uploadedFiles,
}: {
  themeKey: string;
  uploadedFiles: string[];
}) {
  const [state, formAction, pending] = useActionState(uploadThemeFilesAction, initial);

  return (
    <div className="theme-upload">
      <form action={formAction} className="theme-upload-form">
        <input type="hidden" name="key" value={themeKey} />
        <label className="theme-upload-drop">
          <input type="file" name="uploads" multiple accept=".html,.css,.png,.jpg,.jpeg,.svg,.webp,.ico" />
          <span className="theme-upload-prompt">
            Choose files — upload your theme files
          </span>
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Uploading…" : "Upload"}
        </button>
      </form>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

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

      <div className="theme-upload-status">
        <span className="theme-upload-label">Uploaded so far:</span>
        {uploadedFiles.length > 0 ? (
          <ul className="theme-upload-file-list">
            {uploadedFiles.map((f) => (
              <li key={f}>
                <code>{f}</code>
                <form action={deleteThemeFileAction} style={{ display: "inline" }}>
                  <input type="hidden" name="key" value={themeKey} />
                  <input type="hidden" name="filename" value={f} />
                  <button type="submit" className="link-danger" style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>Delete</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted"> no files uploaded yet</span>
        )}
      </div>

      <p className="muted theme-upload-hint">Recognized names: {ALLOWED_UPLOAD_HINT}.</p>
    </div>
  );
}

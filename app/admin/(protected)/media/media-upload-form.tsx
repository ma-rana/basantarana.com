"use client";

// MediaUploadForm — client component that POSTs to /api/media/upload,
// then reloads the page so the new asset appears. One form per media type.
//
// The native file input is visually hidden and driven by a styled label/button
// so the control matches the rest of the admin (the raw browser picker is the
// one element that always looks unstyled). All upload logic is unchanged.

import { useState, useRef } from "react";

export function MediaUploadForm({ type }: { type: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isCV = type === "CV";
  const isVideo = type === "VIDEO_BACKGROUND";
  const accept = isCV ? ".pdf,application/pdf" : isVideo ? "video/mp4,video/webm,video/ogg" : "image/*";
  const acceptHint = isCV ? "PDF" : isVideo ? "MP4, WebM, Ogg" : "JPG, PNG, WebP, GIF";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) { setStatus("error"); setMessage("Choose a file first."); return; }

    setStatus("uploading");
    setMessage("");

    const form = new FormData();
    form.set("type", type);
    form.set("file", file);

    const res = await fetch("/api/media/upload", { method: "POST", body: form });

    let data: { error?: string; id?: string; url?: string } = {};
    try {
      data = await res.json();
    } catch {
      // Response body wasn't JSON (e.g. a hard crash before the handler ran).
      data = { error: `Upload failed (HTTP ${res.status}).` };
    }

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "Upload failed.");
    } else {
      setStatus("ok");
      setMessage("Uploaded.");
      if (inputRef.current) inputRef.current.value = "";
      // Refresh the server component so the new asset appears in the list.
      window.location.reload();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="media-upload-form">
      <label className="file-picker">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="file-picker-input"
          onChange={(e) => {
            setStatus("idle");
            setMessage("");
            setFileName(e.target.files?.[0]?.name ?? "");
          }}
        />
        <span className="file-picker-btn">Choose file</span>
        <span className="file-picker-name" title={fileName || undefined}>
          {fileName || `No file selected · ${acceptHint}`}
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "uploading" || !fileName}
        className="btn-primary"
      >
        {status === "uploading" ? "Uploading…" : "Upload"}
      </button>

      {status === "error" && (
        <span className="form-error" role="alert">{message}</span>
      )}
      {status === "ok" && (
        <span className="form-ok" role="status">{message}</span>
      )}
    </form>
  );
}

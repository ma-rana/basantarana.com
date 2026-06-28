"use client";

// MediaUploadForm — client component that POSTs to /api/media/upload,
// then reloads the page so the new asset appears. One form per media type.

import { useState, useRef } from "react";

export function MediaUploadForm({ type }: { type: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isCV = type === "CV";
  const accept = isCV ? ".pdf,application/pdf" : "image/*";

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
    const data = await res.json();

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
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="media-upload-input"
        onChange={() => { setStatus("idle"); setMessage(""); }}
      />
      <button type="submit" disabled={status === "uploading"} className="btn-secondary">
        {status === "uploading" ? "Uploading…" : "Upload"}
      </button>
      {status === "error" && <span className="form-error" role="alert">{message}</span>}
      {status === "ok"    && <span className="form-ok"    role="status">{message}</span>}
    </form>
  );
}

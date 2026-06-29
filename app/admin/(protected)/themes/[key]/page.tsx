// app/admin/(protected)/themes/[key]/page.tsx — manage one uploaded theme's files.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "../../../../../lib/auth/require-admin";
import {
  getThemeByKey,
  getThemeFileStatus,
  listThemeFiles,
  getExpectedFileStatus,
} from "../../../../../lib/repos/theme";
import { isImageFile } from "../../../../../lib/themes/paths";
import { activateThemeAction, deleteThemeAction } from "../actions";
import { ThemeUpload } from "./theme-upload";
import { ExpectedFilesEditor } from "./expected-files-editor";

export const metadata = { title: "Edit theme · Admin" };

export default async function ThemeFilesPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireAdmin();
  const { key } = await params;
  const theme = await getThemeByKey(key);
  if (!theme) notFound();

  // Built-in themes ship with the repo and aren't editable here.
  if (theme.source !== "uploaded") redirect("/admin/themes");

  const status = await getThemeFileStatus(key, "uploaded");
  // Only home.html is required to activate; every other file is optional.
  const canActivate = status["home.html"];
  const uploadedFiles = await listThemeFiles(key, "uploaded");

  // The author's declared checklist for THIS theme (real engine files + custom
  // tracked names), each resolved to present/missing against the uploaded dir.
  // The Files panel appears only when this list is non-empty.
  const expectedStatus = await getExpectedFileStatus(key, "uploaded", theme.expectedFiles);
  const hasExpected = expectedStatus.length > 0;
  const expectedPresent = expectedStatus.filter((e) => e.present).length;

  // Of the uploaded files, separate true images (decoration) from everything
  // else. Custom pages (skills.html etc.) are NOT images — they're real routed
  // pages — so only count files that pass the image check.
  const imageFiles = uploadedFiles.filter((f) => isImageFile(f));

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div className="theme-title">
          <Link href="/admin/themes" className="btn-back">All themes</Link>
          <h1>{theme.name}</h1>
          <p className="row-sub">
            <code className="field-code">{theme.key}</code> · uploaded theme
            {theme.isActive ? (
              <span className="badge badge-published theme-title-badge">Active</span>
            ) : null}
          </p>
        </div>
      </header>

      <div className={`theme-grid${hasExpected ? "" : " theme-grid-single"}`}>
        {/* Upload panel */}
        <div className="panel theme-panel">
          <div className="panel-head">
            <h2>Upload files</h2>
            <p>
              Pick one or more files and upload them together — each is recognized
              by its filename. HTML is checked for valid Liquid before saving.
            </p>
          </div>
          <ThemeUpload
            themeKey={key}
            uploadedFiles={uploadedFiles}
            status={status}
            imageFiles={imageFiles}
          />
        </div>

        {/* File status checklist — only shown once the author has declared
            expected files. Until then this panel is hidden entirely. */}
        {hasExpected ? (
          <div className="panel theme-panel">
            <div className="panel-head">
              <h2>Files</h2>
              <p>{expectedPresent} of {expectedStatus.length} expected files uploaded.</p>
            </div>
            <ul className="file-status">
              {expectedStatus.map((f) => (
                <li key={f.name} className="file-status-row" data-present={f.present}>
                  <span className={`file-status-dot${f.present ? " is-present" : ""}`} aria-hidden="true" />
                  <span className="file-status-name">
                    <code>{f.name}</code>
                    {f.label ? <span className="file-status-role">{f.label}</span> : null}
                  </span>
                  {f.kind === "tracking" ? (
                    <span
                      className="badge badge-slot file-status-tag"
                      title="The engine doesn't route this file on its own — tracked for your reference only."
                    >
                      {f.present ? "Uploaded" : "Tracking"}
                    </span>
                  ) : (
                    <span className="file-status-state">{f.present ? "Uploaded" : "Missing"}</span>
                  )}
                </li>
              ))}
            </ul>
            {imageFiles.length > 0 ? (
              <p className="file-status-images">
                + {imageFiles.length} image{imageFiles.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Expected-files checklist editor */}
      <div className="panel theme-panel expected-panel">
        <div className="panel-head">
          <h2>Expected files checklist</h2>
          <p>
            Declare the files this theme is meant to include. List only what you
            use — a minimal theme can skip pages it doesn&apos;t have. The six
            standard files drive rendering, and any custom{" "}
            <code className="field-code">name.html</code> you add becomes a live
            page at <code className="field-code">/name</code> (e.g.{" "}
            <code className="field-code">skills.html</code> →{" "}
            <code className="field-code">/skills</code>). Other names (like{" "}
            <code className="field-code">blog.css</code>) are tracked for your
            reference only.
          </p>
        </div>
        <ExpectedFilesEditor themeKey={key} initialStatus={expectedStatus} />
      </div>

      {/* Action bar */}
      <div className="theme-actionbar">
        <div className="theme-actionbar-main">
          {canActivate ? (
            theme.isActive ? (
              <span className="muted">This theme is live on the public site.</span>
            ) : (
              <form action={activateThemeAction}>
                <input type="hidden" name="key" value={key} />
                <button type="submit" className="btn-primary">Activate this theme</button>
              </form>
            )
          ) : (
            <span className="muted">
              Upload <code>home.html</code> before activating.
            </span>
          )}
        </div>
        <form action={deleteThemeAction}>
          <input type="hidden" name="key" value={key} />
          <button type="submit" className="btn-danger">Delete theme</button>
        </form>
      </div>
    </section>
  );
}

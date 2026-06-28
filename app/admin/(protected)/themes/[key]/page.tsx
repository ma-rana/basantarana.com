// app/admin/(protected)/themes/[key]/page.tsx — manage one uploaded theme's files.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { getThemeByKey, getThemeFileStatus, listThemeFiles } from "../../../../../lib/repos/theme";
import { THEME_FILES, isRequiredThemeFile } from "../../../../../lib/themes/paths";
import { activateThemeAction, deleteThemeAction } from "../actions";
import { ThemeUpload } from "./theme-upload";

export const metadata = { title: "Edit theme · Admin" };

// What each named theme file does, shown in the status checklist so the role of
// every slot is clear without leaving the page.
const FILE_ROLE: Record<string, string> = {
  "home.html": "Landing page",
  "layout.html": "Page wrapper (optional)",
  "about.html": "About page",
  "contact.html": "Contact page",
  "project.html": "Project detail page",
  "style.css": "Stylesheet",
};

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

  // Any uploaded names that aren't one of the six roles are images/decoration.
  const namedSet = new Set<string>(THEME_FILES);
  const imageFiles = uploadedFiles.filter((f) => !namedSet.has(f));
  const presentCount = THEME_FILES.filter((f) => status[f]).length;

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

      <div className="theme-grid">
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

        {/* File status checklist */}
        <div className="panel theme-panel">
          <div className="panel-head">
            <h2>Files</h2>
            <p>{presentCount} of {THEME_FILES.length} named files present.</p>
          </div>
          <ul className="file-status">
            {THEME_FILES.map((f) => {
              const present = status[f];
              const required = isRequiredThemeFile(f);
              return (
                <li key={f} className="file-status-row" data-present={present}>
                  <span className={`file-status-dot${present ? " is-present" : ""}`} aria-hidden="true" />
                  <span className="file-status-name">
                    <code>{f}</code>
                    <span className="file-status-role">{FILE_ROLE[f]}</span>
                  </span>
                  {required ? (
                    <span className="badge badge-slot file-status-tag">Required</span>
                  ) : (
                    <span className="file-status-state">{present ? "Added" : "Optional"}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {imageFiles.length > 0 ? (
            <p className="file-status-images">
              + {imageFiles.length} image{imageFiles.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
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

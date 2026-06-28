// app/admin/(protected)/themes/[key]/page.tsx — manage one uploaded theme's files.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "../../../../../lib/auth/require-admin";
import { getThemeByKey, getThemeFileStatus, listThemeFiles } from "../../../../../lib/repos/theme";
import { activateThemeAction, deleteThemeAction } from "../actions";
import { ThemeUpload } from "./theme-upload";

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

  return (
    <section className="content-page wide">
      <header className="content-head row">
        <div>
          <h1>{theme.name}</h1>
          <p className="row-sub">{theme.key} · uploaded theme</p>
        </div>
        <Link href="/admin/themes" className="btn-back">All themes</Link>
      </header>

      <p className="muted">
        Select your theme files and upload them together — each is recognized by
        its filename. HTML files are checked for valid Liquid before saving.
      </p>

      <ThemeUpload themeKey={key} uploadedFiles={uploadedFiles} />

      <p className="muted upload-note">
        <code>home.html</code> is required; the rest are optional — no layout means
        the page is served unwrapped, no <code>style.css</code> means inline CSS, and
        a missing page just 404s.
      </p>

      <div className="theme-actions">
        {canActivate ? (
          theme.isActive ? (
            <span className="badge badge-published">Active</span>
          ) : (
            <form action={activateThemeAction}>
              <input type="hidden" name="key" value={key} />
              <button type="submit" className="btn-primary">Activate this theme</button>
            </form>
          )
        ) : (
          <p className="muted">Upload <code>home.html</code> before activating.</p>
        )}

        <form action={deleteThemeAction}>
          <input type="hidden" name="key" value={key} />
          <button type="submit" className="btn-danger">Delete theme</button>
        </form>
      </div>
    </section>
  );
}

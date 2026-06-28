// app/admin/(protected)/themes/page.tsx — theme switcher + create uploaded themes.

import Link from "next/link";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listThemes } from "../../../../lib/repos/theme";
import { activateThemeAction } from "./actions";
import { CreateThemeForm } from "./create-theme-form";

export const metadata = { title: "Themes · Admin" };

export default async function ThemesPage() {
  await requireAdmin();
  const themes = await listThemes();

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Themes</h1>
        <p>The active theme decides how the public site looks. One at a time.</p>
      </header>

      {themes.length === 0 ? (
        <p className="muted">No themes registered. Seed adds minimal, showcase, simple-basic.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Theme</th><th>Key</th><th>Source</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {themes.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.source === "uploaded"
                    ? <Link href={`/admin/themes/${t.key}`}>{t.name}</Link>
                    : t.name}
                </td>
                <td><span className="row-sub">{t.key}</span></td>
                <td>
                  {t.source === "uploaded"
                    ? <span className="badge badge-draft">Uploaded</span>
                    : <span className="row-sub">Built-in</span>}
                </td>
                <td>
                  {t.isActive
                    ? <span className="badge badge-published">Active</span>
                    : <span className="badge badge-draft">Inactive</span>}
                </td>
                <td className="row-actions">
                  {t.isActive ? (
                    <span className="muted">Current</span>
                  ) : (
                    <form action={activateThemeAction}>
                      <input type="hidden" name="key" value={t.key} />
                      <button type="submit" className="btn-secondary btn-sm">Activate</button>
                    </form>
                  )}
                  {t.source === "uploaded" ? (
                    <Link href={`/admin/themes/${t.key}`} className="btn-ghost btn-sm">Edit files</Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Create a theme</h2>
          <p>
            Make a new uploaded theme, then add its page files (layout, home,
            about, contact, project) and a stylesheet. Files are Liquid
            templates — same placeholders as the built-in themes (see the
            cheatsheet).
          </p>
        </div>
        <CreateThemeForm />
      </div>
    </section>
  );
}

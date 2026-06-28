// app/admin/(protected)/themes/page.tsx — theme switcher.
// Lists registered themes; the active one is marked, others get an Activate button.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { db } from "../../../../lib/db";
import { activateThemeAction } from "./actions";

export const metadata = { title: "Themes · Admin" };

export default async function ThemesPage() {
  await requireAdmin();
  const themes = await db.theme.findMany({ orderBy: { name: "asc" } });

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
            <tr><th>Theme</th><th>Key</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {themes.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td><span className="row-sub">{t.key}</span></td>
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
                      <button type="submit" className="btn-primary">Activate</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted" style={{ marginTop: "1rem" }}>
        Preview the live result at your public site root after activating.
      </p>
    </section>
  );
}

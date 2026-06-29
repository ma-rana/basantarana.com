// app/admin/(protected)/themes/page.tsx — theme switcher + create uploaded themes.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listThemes } from "../../../../lib/repos/theme";
import { activateThemeAction } from "./actions";
import { CreateThemeForm } from "./create-theme-form";
import { ThemesManager } from "./themes-manager";

export const metadata = { title: "Themes · Admin" };

export default async function ThemesPage() {
  await requireAdmin();
  const themes = await listThemes();

  // Serialize for the client component (Date -> ISO string).
  const themeCards = themes.map((t) => ({
    id: t.id,
    key: t.key,
    name: t.name,
    isActive: t.isActive,
    source: t.source,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Themes</h1>
        <p>The active theme decides how the public site looks. One at a time.</p>
      </header>

      {themes.length === 0 ? (
        <p className="muted">No themes registered. Seed adds minimal, showcase, simple-basic.</p>
      ) : (
        <ThemesManager themes={themeCards} activateAction={activateThemeAction} />
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

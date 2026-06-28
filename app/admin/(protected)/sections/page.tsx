// app/admin/(protected)/sections/page.tsx — manage home-page section order + visibility.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listSections } from "../../../../lib/repos/section";
import { SECTION_META } from "../../../../lib/schemas/section";
import { toggleSectionAction, moveSectionAction } from "./actions";

export const metadata = { title: "Sections · Admin" };

export default async function SectionsPage() {
  await requireAdmin();
  const sections = await listSections();

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Home sections</h1>
        <p>Choose which bands appear on the public home page, and in what order.</p>
      </header>

      {sections.length === 0 ? (
        <p className="muted">No sections found. Run the seed to create the defaults.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Order</th><th>Section</th><th>Status</th><th>Move</th><th></th></tr>
          </thead>
          <tbody>
            {sections.map((s, i) => {
              const meta = SECTION_META[s.type];
              return (
                <tr key={s.id}>
                  <td><span className="row-sub">{i + 1}</span></td>
                  <td>
                    <strong>{meta.label}</strong>
                    <div className="row-sub">{meta.blurb}</div>
                  </td>
                  <td>
                    {s.enabled
                      ? <span className="badge badge-published">Enabled</span>
                      : <span className="badge badge-draft">Hidden</span>}
                  </td>
                  <td className="row-actions">
                    <form action={moveSectionAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={i === 0} aria-label={`Move ${meta.label} up`}>↑</button>
                    </form>
                    <form action={moveSectionAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={i === sections.length - 1} aria-label={`Move ${meta.label} down`}>↓</button>
                    </form>
                  </td>
                  <td className="row-actions">
                    <form action={toggleSectionAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="enabled" value={(!s.enabled).toString()} />
                      <button type="submit" className={s.enabled ? "link-danger" : "btn-primary"}>
                        {s.enabled ? "Hide" : "Enable"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="muted" style={{ marginTop: "1rem" }}>
        Order and visibility apply to every theme — each renders these bands in its own style.
      </p>
    </section>
  );
}

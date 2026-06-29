"use client";

// app/admin/(protected)/themes/themes-manager.tsx
// Client-side search + sort over the theme list. The list is fully loaded from
// the server (fine up to a few hundred themes — filtering an array that size is
// instant); only switch to server-side search if the catalog ever grows into
// the thousands. Holds search text + sort mode in React state and renders the
// filtered/sorted result as a list of rows.

import { useMemo, useState } from "react";
import Link from "next/link";

type ThemeCard = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  source: "builtin" | "uploaded";
  createdAt: string; // ISO string (serialized from the server)
};

type SortMode = "active" | "az" | "newest";

export function ThemesManager({
  themes,
  activateAction,
}: {
  themes: ThemeCard[];
  activateAction: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("active");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Filter by name OR key (so you can search either).
    const filtered = q
      ? themes.filter(
          (t) => t.name.toLowerCase().includes(q) || t.key.toLowerCase().includes(q),
        )
      : themes.slice();

    // Sort. "active" puts the active theme first, then A–Z within the rest.
    filtered.sort((a, b) => {
      if (sort === "active") {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sort === "az") return a.name.localeCompare(b.name);
      // newest: latest createdAt first
      return b.createdAt.localeCompare(a.createdAt);
    });
    return filtered;
  }, [themes, query, sort]);

  return (
    <div className="themelist-manager">
      <div className="themelist-toolbar">
        <input
          type="search"
          className="themelist-search"
          placeholder="Search themes by name or key…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search themes"
        />
        <label className="themelist-sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="active">Active first</option>
            <option value="az">Name (A–Z)</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <span className="themelist-count">
          {visible.length} of {themes.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="muted">No themes match “{query}”.</p>
      ) : (
        <div className="themelist-list">
          {visible.map((t) => (
            <article key={t.id} className={`themelist-card${t.isActive ? " themelist-card-active" : ""}`}>
              <div className="themelist-card-head">
                <h3 className="themelist-card-name">
                  {t.source === "uploaded" ? (
                    <Link href={`/admin/themes/${t.key}`}>{t.name}</Link>
                  ) : (
                    t.name
                  )}
                </h3>
                {t.isActive && <span className="badge badge-published">Active</span>}
              </div>
              <p className="themelist-card-key">{t.key}</p>
              <div className="themelist-card-meta">
                {t.source === "uploaded" ? (
                  <span className="badge badge-draft">Uploaded</span>
                ) : (
                  <span className="row-sub">Built-in</span>
                )}
              </div>
              <div className="themelist-card-actions">
                {t.isActive ? (
                  <span className="muted">Current</span>
                ) : (
                  <form action={activateAction}>
                    <input type="hidden" name="key" value={t.key} />
                    <button type="submit" className="btn-secondary btn-sm">Activate</button>
                  </form>
                )}
                {t.source === "uploaded" && (
                  <Link href={`/admin/themes/${t.key}`} className="btn-ghost btn-sm">
                    Edit files
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

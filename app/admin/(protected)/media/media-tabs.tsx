"use client";

// MediaTabs — tab switcher for Photos / Backgrounds / Documents / Links.
// All panel content is server-rendered and passed as React nodes; this
// component only manages which one is shown via the `hidden` attribute.
//
// Implements the WAI-ARIA tabs pattern: roving tabindex + arrow-key navigation,
// and each panel is associated to its tab via id / aria-controls / aria-labelledby.

import { useRef, useState } from "react";

export type TabId = "photos" | "backgrounds" | "documents" | "links";

const TABS: { id: TabId; label: string }[] = [
  { id: "photos", label: "Photos" },
  { id: "backgrounds", label: "Backgrounds" },
  { id: "documents", label: "Documents" },
  { id: "links", label: "Links" },
];

export function MediaTabs({
  photos,
  backgrounds,
  documents,
  links,
}: {
  photos: React.ReactNode;
  backgrounds: React.ReactNode;
  documents: React.ReactNode;
  links: React.ReactNode;
}) {
  const [active, setActive] = useState<TabId>("photos");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const panels: Record<TabId, React.ReactNode> = {
    photos,
    backgrounds,
    documents,
    links,
  };

  // Arrow-key navigation across the tablist (WAI-ARIA tabs pattern).
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="media-tabwrap">
      <div className="media-tabs" role="tablist" aria-label="Media types">
        {TABS.map((t, i) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`media-tab-${t.id}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`media-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={`media-tab${selected ? " media-tab-active" : ""}`}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          id={`media-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`media-tab-${t.id}`}
          hidden={active !== t.id}
          tabIndex={0}
          className="media-panel"
        >
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}

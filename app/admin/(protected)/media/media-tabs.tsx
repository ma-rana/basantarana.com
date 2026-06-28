"use client";

// MediaTabs — tab switcher for Photos / Backgrounds / Documents.
// All panel content is server-rendered and passed as React nodes; this
// component only manages which one is shown via the `hidden` attribute.

import { useState } from "react";

export type TabId = "photos" | "backgrounds" | "documents";

export function MediaTabs({
  photos,
  backgrounds,
  documents,
}: {
  photos: React.ReactNode;
  backgrounds: React.ReactNode;
  documents: React.ReactNode;
}) {
  const [active, setActive] = useState<TabId>("photos");

  const tabs: { id: TabId; label: string }[] = [
    { id: "photos",      label: "Photos" },
    { id: "backgrounds", label: "Backgrounds" },
    { id: "documents",   label: "Documents" },
  ];

  return (
    <div>
      <div className="media-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`media-tab${active === t.id ? " media-tab-active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" hidden={active !== "photos"}      className="media-panel">{photos}</div>
      <div role="tabpanel" hidden={active !== "backgrounds"} className="media-panel">{backgrounds}</div>
      <div role="tabpanel" hidden={active !== "documents"}   className="media-panel">{documents}</div>
    </div>
  );
}

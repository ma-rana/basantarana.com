"use client";

// app/admin/(protected)/drag-list.tsx — reusable drag-to-reorder list.
//
// A generic client component that renders rows you can drag to reorder. On drop
// it reorders optimistically in local state and calls `onReorder` with the new
// id order; the server persists it (save-on-drop). Built on native HTML5
// drag-and-drop — no dependencies.
//
// Accessibility: each row also exposes keyboard reordering on the drag handle
// (↑/↓ move the focused row, with the same persistence), so reordering never
// requires a pointer. The handle is a real button with an aria-label.
//
// This intentionally renders its own row markup (not a <table>) because native
// row dragging inside a <table> is unreliable across browsers. Rows are styled
// to read like table rows via the .drag-* classes in globals.css.

import { useEffect, useRef, useState } from "react";

export type DragItem = {
  id: string;
  /** Main label (e.g. project title, skill name). */
  primary: React.ReactNode;
  /** Optional secondary line under the primary label. */
  secondary?: React.ReactNode;
  /** Optional middle cells (status badge, level, value…). */
  meta?: React.ReactNode;
  /** Right-aligned actions (Edit / Delete). Not draggable. */
  actions?: React.ReactNode;
};

export function DragList({
  items,
  onReorder,
  ariaLabel,
}: {
  items: DragItem[];
  /** Persist the new top-to-bottom id order. Called on every committed move. */
  onReorder: (orderedIds: string[]) => Promise<void>;
  ariaLabel: string;
}) {
  // Local order mirrors the server list, but lets us reorder optimistically.
  const [order, setOrder] = useState<DragItem[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Keep local state in sync if the server list changes (e.g. add/delete).
  useEffect(() => {
    setOrder(items);
  }, [items]);

  function announce(msg: string) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  // Commit a reordered array: update local state, then persist. If the server
  // rejects, the next server render reconciles via the effect above.
  async function commit(next: DragItem[], message: string) {
    setOrder(next);
    announce(message);
    setSaving(true);
    try {
      await onReorder(next.map((i) => i.id));
    } finally {
      setSaving(false);
    }
  }

  function labelOf(item: DragItem): string {
    return typeof item.primary === "string" ? item.primary : "item";
  }

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void commit(next, `Moved ${labelOf(moved)} to position ${to + 1} of ${next.length}.`);
  }

  // ---- Pointer drag ----
  function onDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Firefox needs data set for a drag to begin.
    e.dataTransfer.setData("text/plain", order[index].id);
  }
  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== overIndex) setOverIndex(index);
  }
  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      const moved = order[dragIndex];
      const next = [...order];
      next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      void commit(next, `Moved ${labelOf(moved)} to position ${index + 1} of ${next.length}.`);
    }
    setDragIndex(null);
    setOverIndex(null);
  }
  function onDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  // ---- Keyboard reorder (on the handle) ----
  function onHandleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(index, index - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(index, index + 1);
    }
  }

  return (
    <div
      className={`drag-list${saving ? " is-saving" : ""}`}
      role="list"
      aria-label={ariaLabel}
      aria-busy={saving}
    >
      {order.map((item, index) => (
        <div
          key={item.id}
          role="listitem"
          className={
            "drag-row" +
            (dragIndex === index ? " is-dragging" : "") +
            (overIndex === index && dragIndex !== null && dragIndex !== index ? " is-over" : "")
          }
          draggable
          onDragStart={(e) => onDragStart(e, index)}
          onDragOver={(e) => onDragOver(e, index)}
          onDrop={(e) => onDrop(e, index)}
          onDragEnd={onDragEnd}
        >
          <button
            type="button"
            className="drag-handle"
            aria-label={`Reorder ${labelOf(item)}. Use arrow up and down to move.`}
            onKeyDown={(e) => onHandleKeyDown(e, index)}
          >
            <span aria-hidden="true">⠿</span>
          </button>

          <div className="drag-cell drag-primary">
            <span className="drag-primary-label">{item.primary}</span>
            {item.secondary ? <span className="drag-secondary">{item.secondary}</span> : null}
          </div>

          {item.meta ? <div className="drag-cell drag-meta">{item.meta}</div> : null}

          {item.actions ? <div className="drag-cell drag-actions">{item.actions}</div> : null}
        </div>
      ))}

      {/* Screen-reader announcements for committed moves. */}
      <p ref={liveRef} className="sr-only" role="status" aria-live="polite" />
    </div>
  );
}

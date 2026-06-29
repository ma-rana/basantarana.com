// app/admin/(protected)/messages/page.tsx — contact-form inbox.
//
// Lists messages submitted through the public contact form. Unread first, then
// newest. Each message can be marked read/unread and deleted. The public route
// (app/api/contact/route.ts) writes these; this is where you read them.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { listMessages } from "../../../../lib/repos/contact";
import { markReadAction, deleteMessageAction } from "./actions";

export const metadata = { title: "Messages · Admin" };

// Format a date as a short, readable local string.
function fmt(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function MessagesPage() {
  await requireAdmin();
  const messages = await listMessages();
  const unread = messages.filter((m) => !m.read).length;

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Messages</h1>
        <p>
          Submissions from your contact form.{" "}
          {unread > 0 ? <strong>{unread} unread.</strong> : "All caught up."}
        </p>
      </header>

      {messages.length === 0 ? (
        <p className="muted">No messages yet.</p>
      ) : (
        <div className="msg-list">
          {messages.map((m) => (
            <article
              key={m.id}
              className={`msg-card${m.read ? "" : " msg-unread"}`}
            >
              <div className="msg-head">
                <div className="msg-from">
                  <span className="msg-name">{m.name}</span>
                  <a className="msg-email" href={`mailto:${m.email}`}>{m.email}</a>
                </div>
                <div className="msg-meta">
                  {!m.read && <span className="badge badge-published">New</span>}
                  <time className="msg-date">{fmt(m.createdAt)}</time>
                </div>
              </div>

              <p className="msg-body">{m.message}</p>

              <div className="msg-actions">
                <a className="btn-secondary btn-sm" href={`mailto:${m.email}`}>Reply</a>
                <form action={markReadAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="read" value={(!m.read).toString()} />
                  <button type="submit" className="btn-ghost btn-sm">
                    {m.read ? "Mark unread" : "Mark read"}
                  </button>
                </form>
                <form action={deleteMessageAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

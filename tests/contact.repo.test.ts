// tests/contact.repo.test.ts — ContactMessage inbox repo.
// DB-backed: needs Postgres + the generated client.

import { describe, it, expect, afterEach } from "vitest";
import { db } from "../lib/db";
import {
  createMessage,
  listMessages,
  countUnreadMessages,
  setMessageRead,
  deleteMessage,
} from "../lib/repos/contact";

afterEach(async () => {
  await db.contactMessage.deleteMany();
});

describe("contact repo", () => {
  it("creates a message, unread by default", async () => {
    const m = await createMessage("Ada", "ada@x.com", "Hello there");
    expect(m.name).toBe("Ada");
    expect(m.read).toBe(false);
  });

  it("counts unread messages", async () => {
    await createMessage("A", "a@x.com", "one");
    await createMessage("B", "b@x.com", "two");
    expect(await countUnreadMessages()).toBe(2);
  });

  it("marks a message read and unread, adjusting the unread count", async () => {
    const m = await createMessage("A", "a@x.com", "one");
    await setMessageRead(m.id, true);
    expect(await countUnreadMessages()).toBe(0);
    await setMessageRead(m.id, false);
    expect(await countUnreadMessages()).toBe(1);
  });

  it("lists unread before read regardless of date", async () => {
    // older message, will be marked READ; newer stays UNREAD
    const older = await createMessage("Older", "o@x.com", "older");
    await new Promise((r) => setTimeout(r, 5));
    await createMessage("Newer", "n@x.com", "newer");
    await setMessageRead(older.id, true);

    const list = await listMessages();
    // Unread sorts first even though it's newer; read sorts last.
    expect(list[0].read).toBe(false);
    expect(list[0].name).toBe("Newer");
    expect(list[list.length - 1].read).toBe(true);
    expect(list[list.length - 1].name).toBe("Older");
  });

  it("orders unread newest-first", async () => {
    await createMessage("Older", "o@x.com", "1");
    await new Promise((r) => setTimeout(r, 5));
    await createMessage("Newer", "n@x.com", "2");
    const list = await listMessages();
    // both unread -> newest first
    expect(list[0].name).toBe("Newer");
    expect(list[1].name).toBe("Older");
  });

  it("deletes a message", async () => {
    const m = await createMessage("A", "a@x.com", "bye");
    await deleteMessage(m.id);
    expect(await listMessages()).toHaveLength(0);
  });
});

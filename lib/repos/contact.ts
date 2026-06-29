// lib/repos/contact.ts — contact-message inbox (admin reads; public form writes).
//
// The public contact form (app/api/contact/route.ts) creates rows; the admin
// inbox (app/admin/(protected)/messages) lists them and marks read / deletes.

import { db } from "../db";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

// Admin inbox: newest first, unread before read so fresh messages surface.
export async function listMessages(): Promise<ContactMessage[]> {
  return db.contactMessage.findMany({
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
  });
}

// Count unread, for the nav/dashboard badge.
export async function countUnreadMessages(): Promise<number> {
  return db.contactMessage.count({ where: { read: false } });
}

export async function createMessage(
  name: string,
  email: string,
  message: string,
): Promise<ContactMessage> {
  return db.contactMessage.create({ data: { name, email, message } });
}

export async function setMessageRead(id: string, read: boolean): Promise<void> {
  await db.contactMessage.update({ where: { id }, data: { read } }).catch(() => {});
}

export async function deleteMessage(id: string): Promise<void> {
  await db.contactMessage.delete({ where: { id } }).catch(() => {});
}

// scripts/create-admin.ts
//
// Creates (or updates) an admin user. There is no public signup for an
// admin-only tool, so you bootstrap the first admin from the CLI:
//
//   npx tsx scripts/create-admin.ts admin@example.com "a-strong-password"
//   (or: npm run create-admin -- admin@example.com "a-strong-password")
//
// Re-running with an existing email RESETS that user's password.

// Load .env before importing lib/db (standalone tsx scripts don't auto-load it).
import "dotenv/config";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: tsx scripts/create-admin.ts <email> "<password>"');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Choose a password of at least 12 characters.");
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { password: hashed, role: "ADMIN" },
    create: { email: email.toLowerCase(), password: hashed, role: "ADMIN" },
  });

  console.log(`Admin ready: ${user.email} (id ${user.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

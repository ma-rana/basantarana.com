// scripts/ops/register-starter-theme.ts
//
// One-off: register the built-in "starter" theme as a DB row WITHOUT wiping your
// data (unlike the full seed). Built-in themes only appear in the admin when a
// matching Theme row exists; the folder alone isn't enough. Safe to run more than
// once — it upserts, so a second run is a no-op.
//
// Run:  npx tsx scripts/ops/register-starter-theme.ts

import "dotenv/config";
import { db } from "../../lib/db";

async function main() {
  const existing = await db.theme.findUnique({ where: { key: "starter" } });
  if (existing) {
    console.log('Theme "starter" already registered — nothing to do.');
    return;
  }
  await db.theme.create({
    data: { key: "starter", name: "Starter", isActive: false, source: "builtin" },
  });
  console.log('Registered built-in theme "starter". It now appears in Admin → Themes.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

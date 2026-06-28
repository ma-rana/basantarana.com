// scripts/seed.ts
//
// Puts realistic SAMPLE data in your LOCAL database so themes look real when
// you test them locally. Run once after setting up the DB:
//   npx tsx scripts/seed.ts   (or: npm run db:seed)
//
// This is local/dev convenience. Your LIVE database holds your real content,
// which you manage through the admin — you do NOT seed production with this.
//
// Why realistic data matters: if you seed one tiny project, a theme looks fine
// locally but cramped live with real content. Seed enough to mirror reality.

// Load .env BEFORE importing lib/db (which reads process.env.DATABASE_URL when
// it builds the pg Pool). Unlike the Next.js runtime, a standalone tsx script
// does not auto-load .env, so without this the pool gets no password and pg
// throws "client password must be a string". This import must stay ABOVE the
// lib/db import — ES module imports run top-to-bottom.
import "dotenv/config";
import { db } from "../lib/db";

async function main() {
  // wipe existing sample data (dev only — never run against prod)
  await db.engagementEvent.deleteMany();
  await db.projectTag.deleteMany();
  await db.project.deleteMany();
  await db.tag.deleteMany();
  await db.skill.deleteMany();
  await db.platformStat.deleteMany();
  await db.section.deleteMany();
  await db.theme.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.profile.deleteMany();

  // --- Profile (with short/medium/long bio so themes can pick) ---
  await db.profile.create({
    data: {
      name: "Basanta Rana",
      headline: "Software engineer",
      email: "hello@basantarana.com",
      location: "Melbourne, Australia",
      bioVariants: {
        short: "Building scalable web apps and learning in public.",
        medium:
          "Software engineering student and indie builder. I design and ship full-stack web apps, and I like turning messy real-world problems into clean systems.",
        long: "Software engineering student in Melbourne and an indie builder. I design and ship full-stack web applications — from database modelling through to deployment — and I care about doing it the way real production systems are built: tested, observable, and maintainable. Recently I've been building a sensor-based classroom science app and a fully custom CMS that powers this very site.",
      },
    },
  });

  // --- Tags (relational, filterable) ---
  const [react, ts, mobile, sms] = await Promise.all([
    db.tag.create({ data: { name: "React" } }),
    db.tag.create({ data: { name: "TypeScript" } }),
    db.tag.create({ data: { name: "Mobile" } }),
    db.tag.create({ data: { name: "Automation" } }),
  ]);

  // --- Projects (mix of statuses so you see filtering work) ---
  await db.project.create({
    data: {
      slug: "stemm-lab", title: "STEMM Lab app",
      summary: "React Native sensor games for classroom science.",
      status: "PUBLISHED", featured: true, order: 1,
      content: [
        { type: "heading", text: "Overview" },
        { type: "text", text: "A classroom science game using phone sensors, for Years 5–8." },
      ],
      tags: { create: [{ tagId: react.id }, { tagId: mobile.id }] },
    },
  });
  await db.project.create({
    data: {
      slug: "portfolio-cms", title: "Portfolio CMS",
      summary: "This very site — a custom CMS with swappable HTML themes.",
      status: "PUBLISHED", featured: true, order: 2,
      content: [{ type: "text", text: "A data-driven CMS built to learn real engineering." }],
      tags: { create: [{ tagId: ts.id }, { tagId: react.id }] },
    },
  });
  await db.project.create({
    data: {
      slug: "visaflow", title: "VisaFlow",
      summary: "SMS appointment automation for migration agents.",
      status: "DRAFT", featured: false, order: 3,   // DRAFT: should NOT show publicly
      content: [{ type: "text", text: "Automating reminders over SMS." }],
      tags: { create: [{ tagId: sms.id }] },
    },
  });

  // --- Skills ---
  await db.skill.createMany({
    data: [
      { name: "TypeScript", category: "Languages", level: 85, order: 1 },
      { name: "React / Next.js", category: "Frontend", level: 88, order: 2 },
      { name: "PostgreSQL", category: "Backend", level: 75, order: 3 },
      { name: "Node.js", category: "Backend", level: 80, order: 4 },
    ],
  });

  // --- Platform stats (manual values for now) ---
  await db.platformStat.createMany({
    data: [
      { platform: "github", label: "Followers", value: 120, order: 1 },
      { platform: "youtube", label: "Subscribers", value: 540, order: 2 },
      { platform: "linkedin", label: "Connections", value: 800, order: 3 },
    ],
  });

  // --- Sections (which parts show, in what order) ---
  await db.section.createMany({
    data: [
      { type: "HERO", enabled: true, order: 1 },
      { type: "ABOUT", enabled: true, order: 2 },
      { type: "PROJECTS", enabled: true, order: 3 },
      { type: "SKILLS", enabled: true, order: 4 },
      { type: "STATS", enabled: true, order: 5 },
      { type: "CONTACT", enabled: true, order: 6 },
    ],
  });

  // --- Media library (many per type; one active each) ---
  await db.mediaAsset.createMany({
    data: [
      { type: "AVATAR", url: "/uploads/avatar-sample.webp", filename: "me.jpg", isActive: true },
      { type: "BACKGROUND", url: "/uploads/bg-mountains.webp", filename: "mountains.jpg", isActive: true },
      { type: "BACKGROUND", url: "/uploads/bg-city.webp", filename: "city.jpg", isActive: false },
      { type: "CV", url: "/uploads/cv-2026.pdf", filename: "cv-2026.pdf", isActive: true },
    ],
  });

  // --- Themes (folder name = key; minimal active by default) ---
  await db.theme.createMany({
    data: [
      { key: "minimal", name: "Minimal", isActive: true },
      { key: "showcase", name: "Showcase", isActive: false },
      { key: "simple-basic", name: "Simple Basic", isActive: false },
    ],
  });

  console.log("Seeded sample data. Local site will now look realistic.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

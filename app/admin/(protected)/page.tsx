// app/admin/(protected)/page.tsx — dashboard (served at /admin).
// Behind the (protected) gate. requireAdmin() also re-runs here so the page
// has the user even though the layout already checked — defense in depth and
// it gives us the user object directly.
//
// Real overview: pulls live counts from the repos so the landing page is an
// at-a-glance status board (content totals + engagement), plus quick links
// into the most common create/edit flows.

import Link from "next/link";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { listProjects } from "../../../lib/repos/project";
import { listSkills } from "../../../lib/repos/skill";
import { listThemes } from "../../../lib/repos/theme";
import { getEngagementStats } from "../../../lib/repos/engagement";

export const metadata = { title: "Dashboard · Admin" };

export default async function DashboardPage() {
  const user = await requireAdmin();

  // Pull everything the overview needs in parallel. Each repo read is already
  // resilient on its own; we only need totals here.
  const [projects, skills, themes, stats] = await Promise.all([
    listProjects(),
    listSkills(),
    listThemes(),
    getEngagementStats(),
  ]);

  const published = projects.filter((p) => p.status === "PUBLISHED").length;
  const drafts = projects.filter((p) => p.status === "DRAFT").length;
  const activeTheme = themes.find((t) => t.isActive)?.name ?? "None";

  const metrics = [
    { label: "Published projects", value: published, href: "/admin/projects" },
    { label: "Drafts", value: drafts, href: "/admin/projects" },
    { label: "Skills", value: skills.length, href: "/admin/skills" },
    { label: "Profile views", value: stats.profileViews, href: "/admin/engagement" },
    { label: "Project views", value: stats.totalProjectViews, href: "/admin/engagement" },
    { label: "Likes", value: stats.totalLikes, href: "/admin/engagement" },
  ];

  const actions = [
    { label: "New project", href: "/admin/projects/new" },
    { label: "Add skill", href: "/admin/skills/new" },
    { label: "Edit profile", href: "/admin/profile" },
    { label: "Manage themes", href: "/admin/themes" },
  ];

  return (
    <section className="dashboard">
      <header className="content-head">
        <h1>Dashboard</h1>
        <p>
          Signed in as {user.email} · Active theme: <strong>{activeTheme}</strong>
        </p>
      </header>

      <div className="metric-grid">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} className="metric-card">
            <span className="metric-value">{m.value.toLocaleString()}</span>
            <span className="metric-label">{m.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="dashboard-subhead">Quick actions</h2>
      <div className="quick-actions">
        {actions.map((a) => (
          <Link key={a.label} href={a.href} className="quick-action">
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

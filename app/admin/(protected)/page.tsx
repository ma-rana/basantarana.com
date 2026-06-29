// app/admin/(protected)/page.tsx — dashboard (served at /admin).
// Behind the (protected) gate. requireAdmin() also re-runs here so the page
// has the user even though the layout already checked — defense in depth and
// it gives us the user object directly.
//
// Real overview: pulls live counts from the repos so the landing page is an
// at-a-glance status board. Metrics are grouped into Content and Engagement
// sections; quick links sit below as deliberate entry points.

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

  // Metrics split into two meaningful groups so the board reads as "what I've
  // built" vs "how it's performing".
  const contentMetrics = [
    { label: "Published projects", value: published, href: "/admin/projects", tone: "ok" },
    { label: "Drafts", value: drafts, href: "/admin/projects", tone: "warn" },
    { label: "Skills", value: skills.length, href: "/admin/skills", tone: "accent" },
  ];

  const engagementMetrics = [
    { label: "Profile views", value: stats.profileViews, href: "/admin/engagement", tone: "accent" },
    { label: "Project views", value: stats.totalProjectViews, href: "/admin/engagement", tone: "accent" },
    { label: "Likes", value: stats.totalLikes, href: "/admin/engagement", tone: "ok" },
  ];

  const actions = [
    { label: "New project", href: "/admin/projects/new", desc: "Start a new case study" },
    { label: "Add skill", href: "/admin/skills/new", desc: "List a tool or technology" },
    { label: "Edit profile", href: "/admin/profile", desc: "Update your bio and details" },
    { label: "Manage themes", href: "/admin/themes", desc: "Switch the public look" },
  ];

  return (
    <section className="dashboard">
      <header className="content-head">
        <h1>Dashboard</h1>
        <p>
          Signed in as <strong>{user.email}</strong> · Active theme:{" "}
          <strong>{activeTheme}</strong>
        </p>
      </header>

      <h2 className="dashboard-subhead">Content</h2>
      <div className="metric-grid">
        {contentMetrics.map((m) => (
          <Link key={m.label} href={m.href} className={`metric-card tone-${m.tone}`}>
            <span className="metric-value">{m.value.toLocaleString()}</span>
            <span className="metric-label">{m.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="dashboard-subhead">Engagement</h2>
      <div className="metric-grid">
        {engagementMetrics.map((m) => (
          <Link key={m.label} href={m.href} className={`metric-card tone-${m.tone}`}>
            <span className="metric-value">{m.value.toLocaleString()}</span>
            <span className="metric-label">{m.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="dashboard-subhead">Quick actions</h2>
      <div className="action-grid">
        {actions.map((a) => (
          <Link key={a.label} href={a.href} className="action-card">
            <span className="action-card-label">{a.label}</span>
            <span className="action-card-desc">{a.desc}</span>
            <span className="action-card-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

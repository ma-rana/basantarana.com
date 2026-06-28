// app/admin/(protected)/engagement/page.tsx — engagement dashboard.
// Aggregate counts only (no per-visitor data). Profile views, and per-project
// views + likes.

import { requireAdmin } from "../../../../lib/auth/require-admin";
import { getEngagementStats } from "../../../../lib/repos/engagement";
import { listProjects } from "../../../../lib/repos/project";

export const metadata = { title: "Engagement · Admin" };

export default async function EngagementPage() {
  await requireAdmin();
  const [stats, projects] = await Promise.all([getEngagementStats(), listProjects()]);

  // Map slug -> title so the table reads nicely (fall back to slug).
  const titleBySlug = new Map(projects.map((p) => [p.slug, p.title]));

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Engagement</h1>
        <p>How visitors are interacting with the public site.</p>
      </header>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-value">{stats.profileViews.toLocaleString()}</span>
          <span className="stat-card-label">Home / profile views</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{stats.totalProjectViews.toLocaleString()}</span>
          <span className="stat-card-label">Total project views</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{stats.totalLikes.toLocaleString()}</span>
          <span className="stat-card-label">Total likes</span>
        </div>
      </div>

      <h2 style={{ marginTop: "2rem" }}>By project</h2>
      {stats.perProject.length === 0 ? (
        <p className="muted">No project engagement recorded yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Project</th><th>Views</th><th>Likes</th></tr>
          </thead>
          <tbody>
            {stats.perProject.map((row) => (
              <tr key={row.targetId}>
                <td>{titleBySlug.get(row.targetId) ?? row.targetId}</td>
                <td>{row.views.toLocaleString()}</td>
                <td>{row.likes.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

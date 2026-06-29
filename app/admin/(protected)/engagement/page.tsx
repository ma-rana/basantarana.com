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

  // Rank projects by views so the table reads as a leaderboard; the busiest
  // project sits on top with a position badge.
  const ranked = [...stats.perProject].sort((a, b) => b.views - a.views);
  const topViews = ranked.length > 0 ? Math.max(...ranked.map((r) => r.views), 1) : 1;

  return (
    <section className="content-page wide">
      <header className="content-head">
        <h1>Engagement</h1>
        <p>How visitors are interacting with the public site.</p>
      </header>

      <div className="stat-cards">
        <div className="stat-card tone-accent">
          <span className="stat-card-value">{stats.profileViews.toLocaleString()}</span>
          <span className="stat-card-label">Home / profile views</span>
        </div>
        <div className="stat-card tone-accent">
          <span className="stat-card-value">{stats.totalProjectViews.toLocaleString()}</span>
          <span className="stat-card-label">Total project views</span>
        </div>
        <div className="stat-card tone-ok">
          <span className="stat-card-value">{stats.totalLikes.toLocaleString()}</span>
          <span className="stat-card-label">Total likes</span>
        </div>
      </div>

      <section className="panel engagement-panel">
        <div className="panel-head">
          <h2>By project</h2>
          <p>Views and likes per project, ranked by traffic.</p>
        </div>

        {ranked.length === 0 ? (
          <p className="muted">No project engagement recorded yet.</p>
        ) : (
          <ul className="rank-list">
            {ranked.map((row, i) => {
              const title = titleBySlug.get(row.targetId) ?? row.targetId;
              const pct = Math.round((row.views / topViews) * 100);
              return (
                <li key={row.targetId} className="rank-row">
                  <span className="rank-pos" aria-hidden="true">{i + 1}</span>
                  <span className="rank-main">
                    <span className="rank-title">{title}</span>
                    <span className="rank-bar" aria-hidden="true">
                      <span className="rank-bar-fill" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="rank-stats">
                    <span className="rank-stat">
                      <span className="rank-stat-value">{row.views.toLocaleString()}</span>
                      <span className="rank-stat-label">views</span>
                    </span>
                    <span className="rank-stat">
                      <span className="rank-stat-value">{row.likes.toLocaleString()}</span>
                      <span className="rank-stat-label">likes</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

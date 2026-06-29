// scripts/ops/refresh-stats.ts
//
// Refresh all API-backed platform stats (fetch live numbers, update the cache).
// Manual stats (no apiUrl) are skipped. Run on a schedule so the public site
// shows up-to-date counts without calling external APIs on every page load.
//
// Run manually:  npx tsx scripts/ops/refresh-stats.ts
//
// Cron (every 6 hours), on the VPS:
//   0 */6 * * * cd /full/path/to/app && /usr/bin/npx tsx scripts/ops/refresh-stats.ts >> /var/log/portfolio-stats.log 2>&1
//
// Each API-backed stat needs apiUrl + apiPath set in Admin -> Platform stats.
// Examples:
//   GitHub followers : apiUrl https://api.github.com/users/USERNAME
//                      apiPath followers
//   YouTube subs     : apiUrl https://www.googleapis.com/youtube/v3/channels?part=statistics&id=CHANNEL_ID&key=API_KEY
//                      apiPath items.0.statistics.subscriberCount
// (The YouTube URL contains your API key; it's stored server-side and never
//  rendered to themes.)

import "dotenv/config";
import { refreshAllStats } from "../../lib/repos/platform-stat";

async function main() {
  const results = await refreshAllStats();
  if (results.length === 0) {
    console.log("No API-backed stats to refresh.");
    return;
  }
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`Refreshed ${ok}/${results.length} stat(s).`);
  for (const f of failed) {
    console.warn(`  ! ${f.id}: ${f.error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

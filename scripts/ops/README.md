# Database backups & restore

Once you add real content through the admin, **the database is your site** — there
is no git history for content typed into a CMS. These scripts give you nightly,
restorable backups so the worst case is "lose at most a day," not "lose everything."

## Files
- `backup-db.sh` — nightly `pg_dump` (compressed custom format), timestamped,
  auto-prunes old backups, logs each run.
- `restore-db.sh` — restore from a backup file. Destructive; requires typing `yes`.

Both read `DATABASE_URL` from the app's `.env`, so there's one source of truth for
the connection.

## One-time VPS setup

1. **Install the Postgres client** matching your server's major version (so
   `pg_dump`/`pg_restore` versions line up with the server):
   ```bash
   # Debian/Ubuntu example — match the version to your server (e.g. 17)
   sudo apt-get install -y postgresql-client-17
   ```

2. **Create the backup directory** and give the app user ownership:
   ```bash
   sudo mkdir -p /var/backups/portfolio-cms
   sudo chown "$USER":"$USER" /var/backups/portfolio-cms
   ```

3. **Make the scripts executable:**
   ```bash
   chmod +x scripts/ops/backup-db.sh scripts/ops/restore-db.sh
   ```

4. **Test the backup once, by hand:**
   ```bash
   BACKUP_DIR=/var/backups/portfolio-cms bash scripts/ops/backup-db.sh
   ls -lh /var/backups/portfolio-cms
   ```
   You should see a `portfolio_cms_YYYYMMDD_HHMMSS.dump` file.

5. **Schedule it** with cron (`crontab -e`), nightly at 03:15 server time:
   ```cron
   15 3 * * * BACKUP_DIR=/var/backups/portfolio-cms /full/path/to/app/scripts/ops/backup-db.sh >> /var/backups/portfolio-cms/cron.log 2>&1
   ```
   Use the **absolute** path to the script (cron has a minimal PATH/cwd).

## Test the restore — do this BEFORE you need it

A backup you've never restored is a guess. Test into a *throwaway* database so you
never touch live data:

```bash
# 1. Create a scratch DB
createdb portfolio_cms_restoretest

# 2. Restore the latest backup into it (note TARGET_URL override)
TARGET_URL="postgresql://USER:PASS@localhost:5432/portfolio_cms_restoretest" \
  bash scripts/ops/restore-db.sh /var/backups/portfolio-cms/portfolio_cms_LATEST.dump

# 3. Sanity-check it has your data, then drop it
psql "postgresql://USER:PASS@localhost:5432/portfolio_cms_restoretest" -c '\dt'
dropdb portfolio_cms_restoretest
```

If that works, you have a real safety net. If it doesn't, you found out on a
practice run instead of during an emergency.

## Real-emergency restore (into the live DB)

```bash
bash scripts/ops/restore-db.sh /var/backups/portfolio-cms/portfolio_cms_GOOD.dump
# then make sure the schema matches the app's migrations:
npm run db:migrate
```

The script prints a redacted target and requires you to type `yes`, so you can
confirm you're pointed at the right database before it overwrites anything.

## Off-site copy (strongly recommended)

A backup on the same disk as the database doesn't help if that disk dies. Sync
the backups somewhere else — another host, or object storage (S3 / Backblaze B2 /
Cloudflare R2). The cheapest reliable option is `rclone`:

```bash
# configure once
rclone config            # set up a remote, e.g. named "b2"

# then append to the cron line, after the backup runs:
... backup-db.sh && rclone copy /var/backups/portfolio-cms b2:portfolio-cms-backups
```

Even a weekly off-site copy beats none.

## What's NOT backed up here
`pg_dump` covers the **database** (all your content, projects, messages, etc.).
It does **not** cover uploaded files on disk:
- `public/uploads/` — media you uploaded (images, CV, video)
- `storage/themes/` (or your `THEME_UPLOAD_DIR`) — uploaded theme files

Those live on the filesystem, not in Postgres. Add them to a separate file sync
(the same `rclone copy`, pointed at those dirs) so a restore brings back both the
data **and** the files it references. A restored DB row pointing at a missing
`/uploads/x.webp` shows a broken image — so back up both together.

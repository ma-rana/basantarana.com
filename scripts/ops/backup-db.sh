#!/usr/bin/env bash
#
# scripts/ops/backup-db.sh — nightly PostgreSQL backup for the Portfolio CMS.
#
# WHY THIS EXISTS: once you add real content through the admin, the database IS
# your site. There's no git history for content typed into a CMS. A disk failure,
# a bad migration, or a fat-fingered DELETE can erase everything. This script
# takes a compressed, timestamped dump every night and prunes old ones, so the
# worst case is "lose at most a day", not "lose everything".
#
# WHAT IT DOES:
#   1. Reads DATABASE_URL from the app's .env (one source of truth).
#   2. Runs pg_dump in the custom format (-Fc) — compressed, and restorable with
#      pg_restore (supports selective/parallel restore, unlike a plain .sql).
#   3. Writes to $BACKUP_DIR with a timestamped filename.
#   4. Verifies the dump is non-empty, then deletes backups older than RETAIN_DAYS.
#   5. Logs each run so cron failures are visible.
#
# USAGE (manual test):  bash scripts/ops/backup-db.sh
# USAGE (cron):         see the cron block at the bottom of this file.
#
# REQUIREMENTS: pg_dump (same major version as your server — install the matching
# postgresql-client package), and read access to the app's .env.

set -euo pipefail

# --- Config (override via environment if you like) ---------------------------
# Where this script lives, so paths work regardless of the cwd cron uses.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Backup destination — a persistent dir OUTSIDE the repo (survives redeploys).
# Override on the VPS, e.g. BACKUP_DIR=/var/backups/portfolio-cms.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/portfolio-cms}"

# How many days of nightly backups to keep.
RETAIN_DAYS="${RETAIN_DAYS:-14}"

# Where to read the connection string from.
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"

# Log file (append). Override with LOG_FILE=/path if you centralize logs.
LOG_FILE="${LOG_FILE:-${BACKUP_DIR}/backup.log}"

# --- Helpers -----------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE" >&2; }
die() { log "ERROR: $*"; exit 1; }

# --- Resolve DATABASE_URL ----------------------------------------------------
# Prefer an already-exported DATABASE_URL; otherwise pull it from .env.
if [[ -z "${DATABASE_URL:-}" ]]; then
  [[ -f "$ENV_FILE" ]] || die "No .env at $ENV_FILE and DATABASE_URL not set."
  # Grab the DATABASE_URL line, strip key=, and remove surrounding quotes.
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi
[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL is empty after reading $ENV_FILE."

# --- Prepare destination -----------------------------------------------------
mkdir -p "$BACKUP_DIR" || die "Cannot create backup dir $BACKUP_DIR (permissions?)."

TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
OUT_FILE="${BACKUP_DIR}/portfolio_cms_${TIMESTAMP}.dump"

# --- Dump --------------------------------------------------------------------
# -Fc  : custom format (compressed, restorable with pg_restore)
# --no-owner / --no-privileges : portable across roles, so restore to any DB user
log "Starting backup -> ${OUT_FILE}"
if ! pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges -f "$OUT_FILE"; then
  rm -f "$OUT_FILE"
  die "pg_dump failed (is pg_dump installed and the DB reachable?)."
fi

# --- Verify ------------------------------------------------------------------
# A custom-format dump should be well over a few hundred bytes even when nearly
# empty; a near-zero file means the dump silently produced nothing useful.
SIZE="$(stat -c%s "$OUT_FILE" 2>/dev/null || stat -f%z "$OUT_FILE")"
if [[ "$SIZE" -lt 200 ]]; then
  rm -f "$OUT_FILE"
  die "Backup file is suspiciously small (${SIZE} bytes). Aborting + removed."
fi
log "Backup OK (${SIZE} bytes)."

# --- Prune old backups -------------------------------------------------------
# Delete dumps older than RETAIN_DAYS. -mtime +N is "older than N days".
DELETED="$(find "$BACKUP_DIR" -name 'portfolio_cms_*.dump' -type f -mtime "+${RETAIN_DAYS}" -print -delete | wc -l | tr -d ' ')"
log "Pruned ${DELETED} backup(s) older than ${RETAIN_DAYS} days."

log "Done. ${BACKUP_DIR} now holds $(find "$BACKUP_DIR" -name 'portfolio_cms_*.dump' | wc -l | tr -d ' ') backup(s)."

# -----------------------------------------------------------------------------
# CRON SETUP (run once on the VPS):
#
#   1. Make this executable:
#        chmod +x /path/to/app/scripts/ops/backup-db.sh
#
#   2. Edit the app user's crontab:
#        crontab -e
#
#   3. Add a line to run nightly at 03:15 (server time). Set BACKUP_DIR to a
#      persistent path the app user can write:
#
#        15 3 * * * BACKUP_DIR=/var/backups/portfolio-cms /path/to/app/scripts/ops/backup-db.sh >> /var/backups/portfolio-cms/cron.log 2>&1
#
#   4. Create + own the backup dir once:
#        sudo mkdir -p /var/backups/portfolio-cms
#        sudo chown "$USER":"$USER" /var/backups/portfolio-cms
#
# OFF-SERVER COPY (strongly recommended): a backup on the same disk doesn't help
# if the disk dies. After the dump, sync it somewhere else — another host, an
# object store (S3/B2/R2), or your own machine. E.g. append to the cron command:
#        ... && rclone copy /var/backups/portfolio-cms remote:portfolio-cms-backups
# (configure rclone once with `rclone config`). Even a weekly off-site copy beats
# none.
# -----------------------------------------------------------------------------

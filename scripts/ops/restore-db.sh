#!/usr/bin/env bash
#
# scripts/ops/restore-db.sh — restore the Portfolio CMS database from a backup.
#
# THIS IS DESTRUCTIVE: it overwrites the target database with the contents of a
# backup file. It refuses to run without an explicit "yes" so you can't wipe live
# data by reflex. TEST THIS at least once on a throwaway DB before you need it for
# real — a backup you've never restored is a guess, not a safety net.
#
# USAGE:
#   bash scripts/ops/restore-db.sh /var/backups/portfolio-cms/portfolio_cms_YYYYMMDD_HHMMSS.dump
#
# By default it restores into the DATABASE_URL from .env. To restore into a
# DIFFERENT database (the safe way to test), override the target:
#   TARGET_URL="postgresql://user:pass@localhost:5432/portfolio_cms_restoretest" \
#     bash scripts/ops/restore-db.sh path/to/file.dump
#
# REQUIREMENTS: pg_restore (matching your server's major version).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"

die() { echo "ERROR: $*" >&2; exit 1; }

# --- Args --------------------------------------------------------------------
BACKUP_FILE="${1:-}"
[[ -n "$BACKUP_FILE" ]] || die "Usage: $0 <backup-file.dump>"
[[ -f "$BACKUP_FILE" ]] || die "Backup file not found: $BACKUP_FILE"

# --- Resolve target connection string ---------------------------------------
if [[ -n "${TARGET_URL:-}" ]]; then
  CONN="$TARGET_URL"
else
  [[ -f "$ENV_FILE" ]] || die "No .env at $ENV_FILE and TARGET_URL not set."
  CONN="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi
[[ -n "$CONN" ]] || die "No target connection string resolved."

# --- Confirm (destructive) ---------------------------------------------------
# Show a redacted target so the user can see WHICH db without leaking the password.
REDACTED="$(echo "$CONN" | sed -E 's#(://[^:]+:)[^@]+(@)#\1****\2#')"
echo "About to RESTORE:"
echo "  from : $BACKUP_FILE"
echo "  into : $REDACTED"
echo
echo "This OVERWRITES existing data in that database (--clean drops objects first)."
read -r -p "Type 'yes' to proceed: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || die "Aborted (no 'yes' given)."

# --- Restore -----------------------------------------------------------------
# --clean        : drop existing objects before recreating (so a restore over an
#                  existing DB doesn't collide). --if-exists avoids errors when an
#                  object isn't there.
# --no-owner / --no-privileges : restore as the connecting role, ignoring the
#                  original owner/grants (portable across environments).
# --exit-on-error: stop on the first real error so a half-restore is obvious.
echo "Restoring…"
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error \
  --dbname "$CONN" "$BACKUP_FILE"

echo "Restore complete."
echo
echo "NEXT: the app's Prisma client must match the restored schema. If the backup"
echo "predates a migration, run your migrations to bring the DB up to date:"
echo "  npm run db:migrate"

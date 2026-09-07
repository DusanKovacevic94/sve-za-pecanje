#!/bin/sh
set -eu
umask 077
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"

DB_NAME="${BACKUP_DATABASE:-${POSTGRES_DB:-fishing_marketplace}}"
case "$DB_NAME" in ''|*[!A-Za-z0-9_-]*) echo 'Invalid backup database name' >&2; exit 1 ;; esac
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DAILY_DIR="$BACKUP_ROOT/$DB_NAME/daily"
WEEKLY_DIR="$BACKUP_ROOT/$DB_NAME/weekly"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

# Manual and scheduled jobs must not overlap within one database.
LOCK="$BACKUP_ROOT/$DB_NAME/.lock"
if ! mkdir "$LOCK" 2>/dev/null; then echo 'Backup already running (or stale lock)' >&2; exit 1; fi
DAILY_FILE="$DAILY_DIR/$DB_NAME-$TIMESTAMP.dump"
PARTIAL="$DAILY_FILE.partial"
WEEKLY_FILE="$WEEKLY_DIR/$DB_NAME-$TIMESTAMP.dump"
WEEKLY_PARTIAL="$WEEKLY_FILE.partial"
trap 'rm -f "$PARTIAL" "$WEEKLY_PARTIAL"; rmdir "$LOCK"' EXIT
trap 'exit 1' HUP INT TERM
if [ -e "$DAILY_FILE" ]; then echo 'Backup timestamp already exists' >&2; exit 1; fi

if [ -n "${DATABASE_URL:-}" ]; then
  export BACKUP_DATABASE="$DB_NAME"
  pgtool() { python3 "${PG_BACKUP_HELPER:-/scripts/pg_command.py}" "$@"; }
  ACTUAL_DB="$(pgtool psql -X -At -v ON_ERROR_STOP=1 -c 'SELECT current_database()')"
  [ "$ACTUAL_DB" = "$DB_NAME" ] || { echo 'Backup database URL/name mismatch' >&2; exit 1; }
else
  export PGDATABASE="$DB_NAME"
  export PGHOST="${PGHOST:-${POSTGRES_HOST:-postgres}}"
  export PGPORT="${PGPORT:-${POSTGRES_PORT:-5432}}"
  export PGUSER="${PGUSER:-${POSTGRES_USER:-postgres}}"
  export PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-}}"
  pgtool() { "$@"; }
fi
# Passwords remain in the process environment, never command arguments or success logs.
pgtool pg_dump --format=custom --no-owner --no-acl --lock-wait-timeout=30s --file "$PARTIAL"
pg_restore --list "$PARTIAL" >/dev/null
mv "$PARTIAL" "$DAILY_FILE"
if [ "$(date -u +%u)" = "7" ]; then
  cp "$DAILY_FILE" "$WEEKLY_PARTIAL"
  mv "$WEEKLY_PARTIAL" "$WEEKLY_FILE"
fi

# Legacy flat directories are untouched. Only complete dumps for this DB are pruned.
find "$DAILY_DIR" -type f -name "$DB_NAME-*.dump" | sort -r | awk 'NR>7' | while IFS= read -r file; do rm -f "$file"; done
find "$WEEKLY_DIR" -type f -name "$DB_NAME-*.dump" | sort -r | awk 'NR>4' | while IFS= read -r file; do rm -f "$file"; done

if [ -n "${BACKUP_REMOTE:-}" ]; then
  command -v rclone >/dev/null 2>&1 || { echo 'BACKUP_REMOTE requires rclone' >&2; exit 1; }
  # No remote deletion: independent remote lifecycle must retain recovery generations.
  rclone copy "$BACKUP_ROOT/$DB_NAME" "$BACKUP_REMOTE/$DB_NAME" --exclude '.lock/**' --exclude '*.partial'
fi
date -u +%s > "$BACKUP_ROOT/$DB_NAME/last-success"
echo "Database backup completed: $DB_NAME"

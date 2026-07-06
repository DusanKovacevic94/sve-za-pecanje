#!/bin/sh
set -eu

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_NAME="${POSTGRES_DB:-fishing_marketplace}"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

if [ -n "${DATABASE_URL:-}" ]; then
  TARGET="$(printf '%s' "$DATABASE_URL" | sed 's#postgresql+psycopg://#postgresql://#')"
else
  TARGET="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${DB_NAME}"
fi

DAILY_FILE="$DAILY_DIR/${DB_NAME}-${TIMESTAMP}.dump"
pg_dump "$TARGET" --format=custom --no-owner --no-acl --file "$DAILY_FILE"

if [ "$(date -u +%u)" = "7" ]; then
  cp "$DAILY_FILE" "$WEEKLY_DIR/${DB_NAME}-${TIMESTAMP}.dump"
fi

find "$DAILY_DIR" -type f -name "*.dump" | sort -r | awk 'NR>7' | xargs -r rm -f
find "$WEEKLY_DIR" -type f -name "*.dump" | sort -r | awk 'NR>4' | xargs -r rm -f

if [ -n "${BACKUP_REMOTE:-}" ]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "BACKUP_REMOTE is set but rclone is not installed" >&2
    exit 1
  fi
  rclone copy "$BACKUP_ROOT" "$BACKUP_REMOTE"
fi

echo "$DAILY_FILE"

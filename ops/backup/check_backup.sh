#!/bin/sh
set -eu
database="${BACKUP_DATABASE:-${POSTGRES_DB:-fishing_marketplace}}"
case "$database" in ''|*[!A-Za-z0-9_-]*) exit 1 ;; esac
interval="${BACKUP_INTERVAL_SECONDS:-86400}"
case "$interval" in ''|*[!0-9]*) exit 1 ;; esac
last="$(cat "${BACKUP_ROOT:-/backups}/$database/last-success")"
case "$last" in ''|*[!0-9]*) exit 1 ;; esac
age=$(( $(date -u +%s) - last ))
[ "$age" -ge 0 ] && [ "$age" -lt "$((interval * 2 + 300))" ]

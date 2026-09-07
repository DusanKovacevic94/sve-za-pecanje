#!/bin/sh
set -eu
# Run only after pausing editorial writes/deletes and recording the matching DB dump.
# These are rclone remote paths, not S3 credentials; rclone uses RCLONE_CONFIG.
source_path="${CMS_MEDIA_BACKUP_SOURCE:?Set a dedicated remote:bucket/media path}"
snapshot_path="${CMS_MEDIA_BACKUP_SNAPSHOT:?Set a new remote:bucket/snapshots/<snapshot-id>/media path}"
case "$source_path" in *:*/media) ;; *) echo 'Source must be a remote bucket media prefix' >&2; exit 1 ;; esac
case "$snapshot_path" in *:*/snapshots/*/media) ;; *) echo 'Destination must be a distinct named snapshot' >&2; exit 1 ;; esac
[ "$source_path" != "$snapshot_path" ] || exit 1
# Prefix-only identities cannot HEAD the bare "media" key or create buckets.
# Skip those discovery probes, but retain upload checks and byte verification.
rclone_media() { rclone --s3-no-head-object --s3-no-check-bucket "$@"; }
# Require a new prefix. Failed partial snapshots remain for inspection, never deleted.
existing="$(rclone_media lsf "$snapshot_path" --max-depth 1)"
[ -z "$existing" ] || { echo 'Snapshot destination is not empty' >&2; exit 1; }
rclone_media copy "$source_path" "$snapshot_path" --immutable
rclone_media check "$source_path" "$snapshot_path" --download
echo 'CMS media snapshot copied and byte-verified; record it with the matching database dump.'

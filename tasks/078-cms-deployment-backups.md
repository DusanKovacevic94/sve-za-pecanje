# 078 — CMS production configuration, hostname, and backups

Status: done
Priority: P1

## Goal

Prepare a reproducible release for `cms.svezapecanje.rs` with recoverable CMS data.
This task prepares configuration and rehearsals; it does not authorize production access.

## Work

- [x] Add the CMS production image/service with a non-root user, health check, restart
  policy, production secrets configuration, and private internal networking.
- [x] Add the CMS hostname to Caddy while preserving the main site's API routing. Document
  its DNS record, TLS prerequisites, editor login URL, and local proxy rehearsal.
- [x] Use host-only CMS session cookies, explicit CORS/CSRF origins, and authenticated
  administration. Set CMS noindex headers/robots guidance; robots is not access control.
- [x] Provide a restricted-role database provisioning/migration runbook covering existing
  servers; include migration ordering and backup requirements before upgrades.
- [x] Extend backups for the separate CMS database. Keep retention per database so one
  database's dumps cannot displace another's daily/weekly retention slots.
- [x] Document CMS object-storage backup/version recovery and test restoring the database
  plus referenced media into an isolated environment, including roles and permissions.
- [x] Add publish-hook failure visibility, CMS health monitoring, credential rotation,
  editor password recovery configuration, rollback, and service-isolation notes.
- [x] Extend production-compose validation and image smoke checks for the new service.

## Acceptance criteria

- Merged production configuration exposes only the intended proxy entrypoints, with no
  CMS/database development ports, bind mounts, or embedded credentials.
- A local rehearsal verifies host routing, authentication, production migrations, and
  backup/restore using synthetic articles/media and no production access.
- Restored posts, users, versions, and media render correctly; backup retention is
  independent for each database. Marketplace backup behavior remains covered.
- The deployment runbook lists exact provisioning/DNS/deploy steps for a later explicitly
  authorized rollout and distinguishes configuration readiness from a live deployment.

## Primary files

`cms/Dockerfile`, `docker-compose.prod.yml`, `ops/caddy/Caddyfile`,
`.env.production.example`, `backend/scripts/backup_db.sh`,
`ops/validate_production_compose.py`, `docs/deployment.md`.

## Dependencies

072, 074, 076.

## Implementation and verification — 2026-09-07

- Production CMS uses the existing standalone runner as non-root, with a read-only
  filesystem, tmpfs cache, dropped capabilities, health/restart policy, explicit secrets
  and private internal networking. Maintenance uses a separate opt-in tools service;
  provisioning/bootstrap require explicit confirmation. Seeds stay local-only.
- Caddy adds `cms.<APP_DOMAIN>` and noindex headers. The frontend publishing hook is
  explicitly routed before the marketplace `/api/*` handler. Main marketplace startup
  does not depend on CMS readiness; CMS credentials are blanked in marketplace services.
- Both database backups use a built PostgreSQL/rclone/Python image. Per-database folders
  retain seven daily-run dumps/four Sunday copies independently, with atomic files,
  lock/failure handling, credential-safe URL parsing, off-host copying and freshness
  health checks. Legacy flat backups remain untouched.
- Added a byte-verified, non-overwriting media snapshot helper compatible with restricted
  prefix permissions. Recovery rehearsal uses real dumps and rclone copies, a new database
  and MinIO bucket, restricted restore credentials, media checksums and object-version
  recovery. Disposable resources only; marketplace schema/data remain unchanged.
- [Operations runbook](../docs/cms-operations.md) covers DNS/TLS, provisioning and migration
  order, password recovery, rotation, monitoring, paired snapshots, restore and rollback.
  README, architecture/deployment docs and production configuration examples are updated.

Checks passed:

- CMS lint, TypeScript, 12 unit tests and production build.
- Production backup, CMS tools and CMS runner image builds.
- Merged production Compose validation and four regression tests.
- Five backup tests: independent retention, partial/remote failures, safe target/credential
  handling and per-database freshness checks; shell syntax and Git whitespace checks.
- `pnpm test:production`: local PostgreSQL/MinIO/email fixtures; provisioning and migration
  repeatability/isolation; full database/media recovery; production CMS image behind the
  actual Caddy routes with locally verified TLS; restored accounts/posts/history/media,
  secure host-only login cookies, denied CSRF, routing and CMS outage isolation.
- Reproducible combined entrypoint: `make cms-production-rehearsal`.

Configuration readiness is **not a live deployment**. Actual DNS, public certificates,
provider email delivery, off-host backup credentials/scheduling/retention and alert routing
must be verified during a separately authorized rollout. Marketplace upstream fixtures in
the recovery test prove routing, not the full buyer/seller journey. Task 079's known release
blockers, end-to-end/CI, privacy and brand review remain required. No production access,
deployment, commits, new application migrations/dependencies or brand changes in this task.

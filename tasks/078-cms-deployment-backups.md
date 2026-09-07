# 078 — CMS production configuration, hostname, and backups

Status: todo
Priority: P1

## Goal

Prepare a reproducible release for `cms.svezapecanje.rs` with recoverable CMS data.
This task prepares configuration and rehearsals; it does not authorize production access.

## Work

- [ ] Add the CMS production image/service with a non-root user, health check, restart
  policy, production secrets configuration, and private internal networking.
- [ ] Add the CMS hostname to Caddy while preserving the main site's API routing. Document
  its DNS record, TLS prerequisites, editor login URL, and local proxy rehearsal.
- [ ] Use host-only CMS session cookies, explicit CORS/CSRF origins, and authenticated
  administration. Set CMS noindex headers/robots guidance; robots is not access control.
- [ ] Provide a restricted-role database provisioning/migration runbook covering existing
  servers; include migration ordering and backup requirements before upgrades.
- [ ] Extend backups for the separate CMS database. Keep retention per database so one
  database's dumps cannot displace another's daily/weekly retention slots.
- [ ] Document CMS object-storage backup/version recovery and test restoring the database
  plus referenced media into an isolated environment, including roles and permissions.
- [ ] Add publish-hook failure visibility, CMS health monitoring, credential rotation,
  editor password recovery configuration, rollback, and service-isolation notes.
- [ ] Extend production-compose validation and image smoke checks for the new service.

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

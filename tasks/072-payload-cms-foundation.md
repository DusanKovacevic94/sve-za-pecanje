# 072 — Payload CMS foundation and database isolation

Status: done
Priority: P1

## Goal

Run Payload beside the existing app using a separate database on the same PostgreSQL
instance. See the [blog plan](../docs/blog-implementation-plan.md).

## Work

- [x] Create `cms/` with a compatible, pinned Payload/Next.js/React/Node stack, pnpm
  lockfile, lint/type/build scripts, and a minimal admin application.
- [x] Add a development Docker service and documented local CMS URL/port; avoid the
  existing application and Playwright ports. Keep dependencies separate from `frontend/`.
- [x] Add example CMS settings without credentials and a dedicated database role.
- [x] Provide repeatable database provisioning for both fresh and existing PostgreSQL
  volumes; do not rely exclusively on first-start initialization scripts.
- [x] Add explicit Payload migrations and commands for development and release use.
  Disable automatic schema push in production; never run CMS migrations via Alembic.
- [x] Add an explicit local administrator bootstrap procedure using environment input
  or a secure prompt; disable unauthenticated first-user setup outside local bootstrap.
- [x] Add health checks and document resource requirements and local commands.

## Acceptance criteria

- A fresh checkout can start the existing app and CMS using documented local commands.
- CMS migrations succeed on an empty database and can be rerun without schema drift.
- A restricted-role check proves CMS credentials cannot read/write marketplace tables
  or create roles/databases. CMS changes leave the marketplace schema unchanged.
- Existing development volumes can gain the CMS database without being recreated.
- The standalone CMS image builds without production services or credentials.

## Primary files

`cms/`, `docker-compose.cms.yml`, `.env.example`, `Makefile`, `docs/architecture.md`.

## Verification (2026-09-07)

- Lint, TypeScript, configuration tests, and credential-free standalone build pass.
- Isolated PostgreSQL integration passes: provisioning twice, denied marketplace
  table/role/database privileges, migration rerun and rollback/re-upgrade, blocked
  public registration, one-time local bootstrap, login, and compiled admin assets.
- The same integration checks pass against the non-root standalone Docker image.
- An isolated Compose rehearsal passes fresh startup, bootstrap, and repeat
  provisioning/migrations against its existing volume. Test resources are removed.
- Production Compose validation and the marketplace brand release checks pass.
- Production dependency audit passes at the high threshold; two moderate upstream
  advisories and their mitigations are documented in [the CMS guide](../cms/README.md).

No production DNS, deployment, or public blog changes are part of this task. Setup
and commands are in [cms/README.md](../cms/README.md); editorial content and roles are
next in task 073.

## Dependencies

None. Recheck current [Payload requirements](https://payloadcms.com/docs/getting-started/installation).

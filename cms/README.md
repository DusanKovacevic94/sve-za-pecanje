# Sve Za Pecanje CMS

Payload CMS for the blog rendered by the existing marketplace frontend.
The service provides isolated database provisioning, explicit migrations,
health checks, administrator/editor accounts, draft/versioned articles, public author
profiles, image uploads/variants, password recovery, scoped editor previews and
signed publishing notifications (tasks 072–076). See [the content API](CONTENT_API.md),
[image storage](MEDIA_STORAGE.md), and [public blog/preview setup](../docs/blog-publishing.md).

## Pinned stack

Payload 3.88.0, Next.js 16.3.4, React 19.2.8, pnpm 10.33.0, TypeScript 5.9.3.
The Docker image and `.node-version` use Node 22.23.2. Direct local commands support
Node 22.20+ on the 22.x line. Dependencies and migrations are independent of the
marketplace frontend and its Alembic-managed backend.

## Start with Docker

From the application repository:

1. Follow the existing application setup to create the root `.env`. Add distinct
   random `CMS_DATABASE_PASSWORD` (16+ characters) and `CMS_SECRET` (32+ characters).
   `openssl rand -hex 32` generates a suitable value; run it separately for each.
   Also set `CMS_S3_ACCESS_KEY_ID=szp-cms` and a distinct random
   `CMS_S3_SECRET_ACCESS_KEY` (16+ characters) for the dedicated local MinIO identity.
2. Ensure `POSTGRES_USER` and `POSTGRES_PASSWORD` match the existing local PostgreSQL
   volume. Changing an environment file does not change an existing server password.
3. Run `make cms-dev` for the CMS and its database dependencies, or `make dev-with-cms`
   for the complete local application stack.
4. In another terminal, bootstrap the initial administrator using the procedure below.
5. Open `http://localhost:3002/admin`.

The optional `docker-compose.cms.yml` overlay starts database provisioning/migrations
and a separate local storage provisioner before the CMS. The regular development and
production Compose commands do not include this development overlay. The production
overlay now contains a separate hardened CMS service and profile-gated maintenance tool.
See [CMS operations](../docs/cms-operations.md) for ordered provisioning, migrations,
`https://cms.svezapecanje.rs/admin`, and recovery rehearsal. An actual rollout still
requires the release gate and explicit production authorization.

CMS source files are mounted for development; dependencies and Next.js output use
dedicated volumes. After collection/config changes, create a migration, rebuild the
tools image, and run `make cms-migrate`. Production images never generate schema changes
or run migrations at startup.

## Bootstrap the local administrator

Run these Bash commands from the application root. Password input is hidden and does
not enter shell history. No default administrator or public sign-up is provided.

```bash
read -r -p 'CMS email: ' CMS_BOOTSTRAP_EMAIL
read -r -s -p 'CMS password (16+ characters): ' CMS_BOOTSTRAP_PASSWORD
export CMS_BOOTSTRAP_EMAIL CMS_BOOTSTRAP_PASSWORD
make cms-bootstrap
unset CMS_BOOTSTRAP_EMAIL CMS_BOOTSTRAP_PASSWORD
```

The command works only in development/test against loopback or Compose PostgreSQL.
It refuses when any CMS user exists and serializes concurrent attempts. It never resets
an existing password. The web first-user form is disabled and the database write hook
also blocks the first-registration API. Bootstrap creates an administrator; existing
foundation accounts remain administrators after the task 073 migration. Administrators
create editor accounts in the Users collection. Editors manage content and publish,
but cannot manage accounts, change roles, or unlock users.

## Direct local commands

Copy `cms/.env.example` to `cms/.env`, fill the secrets, and point it at the local
PostgreSQL port. `CMS_PROVISION_USER`/`CMS_PROVISION_PASSWORD` are used only by the
explicit provisioning command, never by the CMS web application. Keep CMS_ENV set to
development for local use, including when testing a production Next.js build.

```bash
cd cms
pnpm install --frozen-lockfile
pnpm db:provision
pnpm migrate
pnpm storage:provision
pnpm bootstrap
pnpm dev
```

For the direct bootstrap command, supply the same bootstrap environment variables as
above, or set them temporarily in the ignored local CMS environment file and remove
them afterward. Ordinary web startup does not need bootstrap credentials.

## Database ownership and migrations

Provisioning is idempotent on fresh and existing local servers. It creates
`svezapecanje_cms` owned by the provisioning administrator and a `szp_cms` login with
CONNECT and public-schema USAGE/CREATE. That login has no superuser, database creation,
role creation, replication, or row-security bypass privileges and no role memberships.
It owns the tables created by Payload migrations, not the database itself.

Provisioning refuses unexpected existing database owners or privileged CMS roles.
It does not touch marketplace schemas or grants. PostgreSQL's default CONNECT permission
on other databases is not table access: tests demonstrate that the CMS role cannot read,
write, or alter marketplace-owned tables. Do not grant marketplace privileges to it.

Use explicit generated migrations; schema push is disabled in every environment:

```bash
pnpm generate
pnpm migrate:create describe_the_change
pnpm migrate
pnpm migrate:status
```

Task 073 adds `20260907_094724_editorial_content`. Its upgrade preserves existing
administrators and its downgrade removes editorial tables and the role field. Payload
rollbacks apply to the whole latest migration batch; do not use them casually against
valuable data. Back up before release migrations (production procedures are task 078).

Task 082 adds `20260908_105018_social_copy_fields`: two nullable override columns on
posts and corresponding columns on retained versions. It does not change public article
fields or backfill copy. Apply it before deploying the matching CMS build. Downgrading
removes those social overrides from posts/versions, so back up before rollback; the
existing article title, excerpt, body, and SEO fields are preserved.

Local password recovery goes to Mailpit at `http://localhost:8025`; `make cms-dev`
starts it as a dependency. Direct local commands use `CMS_SMTP_HOST=127.0.0.1` and
`CMS_SMTP_PORT=1025`. Production requires separate CMS configuration for the existing
Resend account: `CMS_RESEND_API_KEY` and verified `CMS_EMAIL_FROM`. Neither is needed
for builds or local tests. See [authentication and recovery](CONTENT_API.md#authentication-and-recovery).

Review generated SQL and retain its snapshot and index in source control. A release
uses migrations from the `tools` image before starting the matching `runner` image.
Never mix these with backend Alembic migrations. The initial schema is included as
`src/migrations/20260907_091809_initial.ts` and its generated snapshot.

## Validation

Editors can follow the [browser-based editor guide](../docs/blog-editor-guide.md).
The [release checklist](../docs/blog-release-checklist.md) maps the complete CI gate,
synthetic fixtures, privacy review and later authorized rollout steps.

```bash
make cms-check
make cms-test-integration
make cms-test-compose
make cms-image-check
cd cms
CMS_TEST_IMAGE=szp-cms:local pnpm test:integration
```

`cms-check` runs lint, types, configuration tests, and the standalone build. Builds use
non-runtime configuration and an unreachable database address; no running database or
real credentials are needed. Runtime requires its own secrets.

Integration checks require Docker and a built CMS. They create an isolated PostgreSQL
16 container, randomly allocated loopback ports, network, passwords, and synthetic
marketplace table. They prove repeatable provisioning/migrations, denied privileges,
blocked public bootstrap, one-time local bootstrap, admin login/assets, and unchanged
marketplace schema/data. They also verify initial migration rollback and re-upgrade.
`CMS_TEST_IMAGE` runs those HTTP checks against the actual
standalone image instead of a local Next.js process. Only resources created by the
test run are removed afterward; no developer/production database URL is accepted.

The suite also provisions isolated MinIO/Mailpit and tests uploads, version-safe media
deletion, and restart persistence. Its browser check renders actual image URLs through
the frontend optimizer. Install frontend dependencies and Chromium first:
`cd frontend && pnpm install --frozen-lockfile && pnpm exec playwright install chromium`
(from the application root). See [media verification](MEDIA_STORAGE.md#verification-and-rollout-limits).

`cms-test-compose` rehearses the documented development overlay with its own project
name, volumes, random ports, and synthetic credentials. It verifies startup ordering,
administrator bootstrap, and repeated provisioning/migrations against an existing
volume. It removes only that rehearsal's resources afterward.

The lockfile pins DOMPurify 3.4.15 to pick up upstream sanitizer fixes. At foundation
validation, `pnpm audit --prod --audit-level high` passes. Two moderate advisories
remain: esbuild in migration tooling (its development HTTP server is not used here),
and Payload's default unlock access (this collection explicitly grants unlock only
to CMS administrators, with negative editor/anonymous integration tests). Recheck the
audit when upgrading dependencies.

## Health and operating limits

- `/health/live`: process responsiveness, without initializing Payload.
- `/health/ready`: valid runtime configuration, PostgreSQL connection, initial users
  table; returns 503 on failure without exposing connection details.
- PostgreSQL pool: at most five connections per CMS process, five-second connect timeout.
- For local development, budget roughly 2 GB RAM for the CMS plus its shared services;
  allow more headroom during builds. This is a starting budget, not a capacity benchmark.
- Public blog pages are not implemented yet. Production DNS/TLS,
  resource sizing, mail credentials, backup/restore, monitoring, and production
  bootstrap are addressed by later tasks.

Reference: [Payload compatibility](https://payloadcms.com/docs/getting-started/installation)
and [Payload migrations](https://payloadcms.com/docs/database/migrations), checked 2026-09-07.

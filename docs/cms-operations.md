# CMS production configuration and recovery (078)

This is a **runbook for a later authorized rollout**, not evidence of a live deployment.
Task 078 changes configuration and runs local synthetic rehearsals only. Complete 079's
release/brand/privacy gates and obtain production authorization before running the
production commands below. Do not publish the `probni-` fixtures.

## Topology and credentials

Use `docker-compose.yml` + `docker-compose.prod.yml` only. Do not layer the development
`docker-compose.cms.yml` into production. Compose must support `!reset` and `!override`.

The CMS runner is a non-root, read-only standalone image, with writable tmpfs only for
`/tmp` and Next's cache, dropped capabilities, no host ports/bind mounts, and a readiness
check. PostgreSQL, Caddy, frontend and backend communicate with it over `cms_private`
(an internal Docker network); `cms_egress` permits outbound object storage/email access.
No CMS dependency is added to marketplace startup. CMS failure degrades blog reads, not
marketplace APIs. CMS schema migrations never run automatically in the web entrypoint.

Database `svezapecanje_cms` and role `szp_cms` stay separate from the marketplace. Runtime
receives explicit CMS-only environment keys, never database-admin/bootstrap/marketplace
credentials. Marketplace backend/worker overrides blank CMS credentials inherited from
the common deployment env file. Frontend receives only preview/revalidation signing keys
and the public image base; the latter must match at image build and runtime.

Copy/update `.env.production.example` in an **untracked**, operator-owned file with mode
600. Set four independent 32+ character values for `CMS_DATABASE_PASSWORD`, `CMS_SECRET`,
`CMS_PREVIEW_SECRET`, and `CMS_REVALIDATE_SECRET`; also configure a CMS-only storage key,
bucket and Resend key/from address. No build needs private credentials. Keep
`BLOG_ANALYTICS_ENABLED=false` until 079's disclosure/fixture review is complete.
Do not send rendered `docker compose config` output to shared logs: it contains secrets.
The validator reports errors without printing configuration values.

The runtime Resend adapter requires `CMS_RESEND_API_KEY` and a verified bare email address
in `CMS_EMAIL_FROM` (not a display-name string). Verify that sender in the provider before
rollout. Local recovery-email tests use Mailpit; the production TLS rehearsal uses a
dummy provider key and sends no real mail. Live sender/delivery verification remains an
authorized release check. Editors use Payload's forgot-password action; recovery tokens
expire after 30 minutes. Never email or log a bootstrap password.

## DNS, TLS and routing

Later, add an `A` record `cms.svezapecanje.rs` pointing to the authorized VPS address.
Add `AAAA` only if IPv6 actually reaches that VPS; remove stale records through a separate
approved DNS change. Permit inbound 80/443 to Caddy; check any CAA rules allow its configured
certificate issuer. Caddy obtains public certificates only when DNS and ingress work.

Editor URL: `https://cms.svezapecanje.rs/admin`. CMS API/admin and public media are separate:
all CMS responses carry noindex guidance; authenticated admin access, not robots, protects
editing. Cookies are host-only, HttpOnly, Secure and SameSite=Lax; no parent-domain cookie
is configured. Payload CORS/CSRF allow only the exact CMS origin. The preview handoff goes
to the main site's separately scoped, short-lived preview cookie.

On the main host, `/api/blog/revalidate` routes to Next before `/api/*` routes to FastAPI.
The hook still verifies its signature; private CMS delivery uses `http://frontend:3000`
and never needs public DNS. Marketplace `/health/*`, `/uploads/*` and API routing remain
unchanged. `cms.<APP_DOMAIN>` routes only to `cms:3002`. The existing analytics host is
`stats.<APP_DOMAIN>`; align `NEXT_PUBLIC_ANALYTICS_URL` with it if Umami is enabled.

## Provision, migrate, bootstrap, start

Commands in this section require **separate production authorization**. Run from the
application checkout. Define one consistent Compose invocation:

```sh
export APP_ENV_FILE=.env.production
dc() { docker compose --env-file "$APP_ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml "$@"; }
APP_ENV_FILE=.env.production make validate-prod
dc --profile maintenance build cms cms-maintenance frontend backup cms-backup
```

Record the release Git revision and immutable image IDs/digests. Preserve the previous
images/configuration for rollback. Before any upgrade, pause editor writes/deletes and
capture a **paired CMS database + media snapshot** as below; verify an off-host copy.
Marketplace database migrations/backups remain independent and retain their own ordering.

Start/verify PostgreSQL first. On an existing server, never recreate its volume or run
`down -v`. Provision via the one-shot tools image (private Compose database host only):

```sh
dc up -d postgres redis
# Supply CMS_PROVISION_USER and CMS_PROVISION_PASSWORD from the operator's secret store.
export CMS_MAINTENANCE_CONFIRM=svezapecanje_cms
dc run --rm --no-deps -e CMS_MAINTENANCE_CONFIRM -e CMS_PROVISION_USER -e CMS_PROVISION_PASSWORD cms-maintenance pnpm db:provision
unset CMS_PROVISION_PASSWORD CMS_PROVISION_USER CMS_MAINTENANCE_CONFIRM
dc run --rm --no-deps cms-maintenance pnpm migrate
dc run --rm --no-deps cms-maintenance pnpm migrate:status
```

Provisioning serializes concurrent attempts, refuses unexpected database ownership,
elevated role flags or role memberships, and creates/grants only the CMS database/schema.
The database/public schema stay admin-owned; `szp_cms` can connect and create its own tables,
not databases/roles/schemas or marketplace data. Repeating provisioning rotates the CMS
role password to the supplied `CMS_DATABASE_PASSWORD`; coordinate it with web/backups.
Do not bypass a refused ownership/membership check without reviewing the existing grants.

Bootstrap only when the CMS has **zero accounts**:

```sh
# Supply CMS_BOOTSTRAP_EMAIL and CMS_BOOTSTRAP_PASSWORD from an operator secret store.
export CMS_MAINTENANCE_CONFIRM=svezapecanje_cms
dc run --rm --no-deps -e CMS_MAINTENANCE_CONFIRM -e CMS_BOOTSTRAP_EMAIL -e CMS_BOOTSTRAP_PASSWORD cms-maintenance pnpm bootstrap
unset CMS_BOOTSTRAP_PASSWORD CMS_BOOTSTRAP_EMAIL CMS_MAINTENANCE_CONFIRM
dc up -d cms frontend caddy backup cms-backup
dc ps
```

Bootstrap refuses any non-empty user table. Public first-user registration stays blocked.
The local `seed` and storage provisioning helpers remain forbidden in production even
with maintenance confirmation. Create production bucket/policies with a separately
authorized provider operator; follow [CMS storage isolation](../cms/MEDIA_STORAGE.md).

Check CMS readiness, editor login, compiled assets, noindex, preview and publishing;
confirm marketplace readiness and a public category. Only run live smoke after approval.

## Database backups and retention

`backup` and `cms-backup` run the same script with separate target identities. Layout:

```text
/backups/fishing_marketplace/{daily,weekly}/...
/backups/svezapecanje_cms/{daily,weekly}/...
```

Each database retains seven complete daily-run dumps and four Sunday copies. Extra manual
runs also consume slots; this is file-count retention, not seven distinct calendar days.
Old `/backups/daily` and `/backups/weekly` directories are deliberately untouched: retain
them until an operator has verified new backups and migrated/retired legacy generations.

The script validates the database name and actual URL target, locks one database at a
time, writes a private `.partial`, checks its archive listing and atomically renames it.
Failed dumps do not prune good backups. A stale `.lock` fails closed: investigate whether
a backup process still runs before removing that exact lock. Remote copying never deletes
objects. Use an encrypted/restricted off-host rclone remote with an independently reviewed
lifecycle; configure `BACKUP_RCLONE_CONFIG` to an absolute, mode-600 file and verify access.
Do not put backup credentials in the CMS runtime. Off-host storage/retention is not
provisioned automatically by this task.

Manual database backups (entrypoint is already `/bin/sh`):

```sh
dc run --rm --no-deps backup /scripts/backup_db.sh
dc run --rm --no-deps cms-backup /scripts/backup_db.sh
dc run --rm --no-deps --entrypoint find cms-backup /backups/svezapecanje_cms -name '*.dump'
```

Default interval is 86400 seconds. Failed runs emit `DATABASE BACKUP FAILED`. Health checks
fail if a database has no successful backup, or its `last-success` exceeds two intervals
plus five minutes. A configured remote must copy successfully before that marker advances.
Container health alone does not page anyone: attach the operator's alerting system to
unhealthy containers and backup failure logs before launch. Monitor remote dump timestamps
too; a local volume is not disaster recovery. Database dumps contain private users/drafts,
so never use a public image bucket as their destination.

## Paired media snapshots and restore

Enable versioning on the dedicated CMS bucket with operator credentials; runtime keys
must not be able to remove historical versions or change lifecycle/policies. Keep current
`media/` objects indefinitely and retain previous versions for at least the longest DB
recovery window plus operational margin (initial policy: 45 days). Versioning helps recover
deleted/overwritten objects; it is not an independent off-site backup.
[Hetzner versioning instructions](https://docs.hetzner.com/storage/object-storage/howto-protect-objects/protect-versioning/).

For a consistent snapshot: pause CMS/editor writes and deletes, take the CMS dump, then
copy **all** `media/` objects (masters and variants, including draft/history-only media)
to a new off-host snapshot prefix. Record the dump filename, release revision, schema
ledger, bucket/prefix, object count and snapshot identifier together. Resume CMS only
after copying and verifying. The helper does not stop the CMS for you:

```sh
dc stop cms
dc run --rm --no-deps cms-backup /scripts/backup_db.sh
# Configure source/destination rclone remotes with separate read/backup-write identities.
export CMS_MEDIA_BACKUP_SOURCE='cms-source:dedicated-cms-bucket/media'
export CMS_MEDIA_BACKUP_SNAPSHOT='cms-recovery:private-recovery-bucket/snapshots/REPLACE-WITH-UNIQUE-ID/media'
sh ops/backup/snapshot_cms_media.sh
dc start cms
```

The helper requires an empty snapshot destination and verifies bytes with `rclone check
--download`; on failure it leaves the partial snapshot for inspection and does not declare
success. It sets `--s3-no-check-bucket` and `--s3-no-head-object` so prefix-only identities
do not need bucket creation or access to the bare `media` key; configure the same settings
on a restricted restore remote. Upload integrity checks and byte verification remain on.
See [rclone S3 options](https://rclone.org/s3/#s3-no-head-object).
Schedule paired snapshots under the operator's existing backup scheduler and
review disruption/RPO before launch. Automatic daily DB dumps alone do **not** establish a
whole-CMS RPO. Keep media snapshots at least as long as their paired database dumps.

Restore only into a **fresh isolated PostgreSQL server/project and isolated bucket**:

1. Provision the restricted `szp_cms` role/database there using the runbook and new keys.
2. Restore the selected dump as `szp_cms` with `pg_restore --exit-on-error --no-owner
   --no-acl -h postgres -U szp_cms -d svezapecanje_cms <exact-dump>`. Use `PGPASSWORD` via a
   secret store; no password in arguments. Do not use `--clean` against a live database.
3. Restore its complete media snapshot to the same `media/` keys in the isolated bucket,
   byte-check it, and reinstate separate runtime permissions and public `GetObject` only
   on that prefix. Check denied writes/deletes on unrelated buckets and prefixes.
4. Start the **matching release** with the restored database, independent storage keys,
   test hostname, analytics off and outbound email disabled/isolated. Confirm its migration
   ledger before a newer image's migrations; schema rollback is not implicit.
5. Check login, users, published posts, draft revisions/versions, authors and every master/
   variant reference, plus public article and preview rendering. Compare counts and hashes.
6. For one deleted object, list versions and retrieve the verified earlier version into
   an isolated location first, compare its hash, then copy it as a new current version.
   Do not delete all versions or expire history while database backups reference them.

A failed production migration requires keeping writers stopped and evaluating transaction
state. Prefer a forward fix; restoring a pre-upgrade DB/media pair loses later writes.
Switching an old image onto an incompatible new schema is not rollback. Any production
restore or traffic switch needs explicit approval and a documented recovery point.

## Monitoring and rotation

- `/health/live` tests the process; `/health/ready` checks database/schema access with bounded
  queries. Object-storage/email availability need separate operator probes; readiness is
  not proof those providers work. Alert on sustained CMS 5xx/unhealthy state.
- Alert on `Blog invalidation delivery failed`; verify private routing and matching hook
  secrets. Public no-store reads still reconcile after a missed hook; there is no durable
  delivery queue. Never log request bodies, signatures, preview fragments or cookies.
- Rotate storage credentials by installing/verifying a new restricted key, recreating CMS,
  then revoking the old key. Do not rotate bucket URLs as if they were passwords.
- Rotate DB password with the guarded provision operation during a CMS maintenance window;
  recreate CMS and cms-backup together. Changing only the env file does not rotate PostgreSQL.
- Rotate preview/hook secrets together on CMS + frontend; active preview capabilities expire
  immediately on rotation. CMS session-secret rotation invalidates logins; password-recovery
  tokens have their own stored expiration and are not revoked by rotating that secret.
  Plan fresh session/signing credentials after a real recovery and keep secrets separate
  from snapshots. Never put them in snapshot manifests.

## Local reproducible rehearsal

No real DNS, external email, ACME, production DB or production storage is accessed:

```sh
python3 ops/validate_production_compose.py
python3 -m unittest discover -s ops -p test_validate_production_compose.py
python3 -m unittest discover -s ops -p test_backup_db.py
docker build --target runner -t szp-cms:078-rehearsal cms
docker build -f ops/backup/Dockerfile -t szp-backup:078-rehearsal .
docker build --target tools -t szp-cms:078-tools cms
cd cms
pnpm build
CMS_TEST_SCOPE=production pnpm test:integration
```

The harness owns generated containers/networks/volumes only. It takes real dumps, provisions
a fresh restore server, restores using the restricted role, exercises the media snapshot
helper with real rclone copies into an isolated volume and back into fresh MinIO, rejects
snapshot reuse, verifies media bytes and object version recovery, and starts the read-only
production CMS image behind the real production
Caddy routes with `local_certs`. TLS is verified against that disposable CA (not bypassed).
It checks restored login/content/history/media, secure host-only cookies, CSRF, main API vs
blog-hook routing and marketplace isolation during CMS outage. Upstream marketplace fixtures
test routing, not the complete buyer/seller journey; that remains 079's release gate.

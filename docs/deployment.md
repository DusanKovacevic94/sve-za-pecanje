# Deployment

## Hetzner VPS Production

This deployment uses Docker Compose on one VPS with Caddy as the public reverse proxy.
Only Caddy should expose public HTTP/HTTPS ports. PostgreSQL, Redis, backend, frontend,
worker, and backup services should not be reachable from the public internet. MinIO and
Mailpit are development services and are removed by the production Compose overlay.

1. Provision an Ubuntu VPS.
2. Point DNS `A` and `AAAA` records for `APP_DOMAIN` to the server.
3. Install Docker Engine and a recent Docker Compose plugin. The production overlay uses
   Compose's `!reset` tag to remove development port mappings.
4. Open only SSH, HTTP, and HTTPS in the Hetzner firewall: `22`, `80`, `443`.
5. Copy `.env.production.example` to `.env` and replace every placeholder. The real `.env`
   remains unversioned on the VPS; never edit tracked application or Compose files there.
6. Set production values:

```dotenv
APP_ENV=production
APP_DOMAIN=svezapecanje.rs
APP_URL=https://svezapecanje.rs
API_URL=https://svezapecanje.rs
CORS_ALLOWED_ORIGINS=https://svezapecanje.rs
NEXT_PUBLIC_API_URL=https://svezapecanje.rs/api/v1
INTERNAL_API_URL=http://backend:8000/api/v1
TURNSTILE_ENABLED=false
TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
PHONE_VERIFICATION_ENABLED=false
POSTGRES_DB=fishing_marketplace
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-postgres-admin-password>
DATABASE_URL=postgresql+psycopg://fishing_app:<strong-app-password>@postgres:5432/fishing_marketplace
RESEND_API_KEY=<resend-api-key>
SENTRY_DSN=<backend-sentry-dsn>
NEXT_PUBLIC_SENTRY_DSN=<frontend-sentry-dsn>
STORAGE_BACKEND=hetzner
HETZNER_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_STORAGE_BUCKET=<bucket>
HETZNER_STORAGE_ROOT_FOLDER=sve-za-pecanje
HETZNER_STORAGE_PUBLIC_URL=https://<bucket>.fsn1.your-objectstorage.com
HETZNER_STORAGE_ACCESS_KEY=<key>
HETZNER_STORAGE_SECRET_KEY=<secret>
BACKUP_REMOTE=<rclone-remote>:sve-za-pecanje/postgres
```

Keep Turnstile disabled for the first deployment of its keys, confirm the frontend widget
loads, then enable it. See [adaptive anti-abuse and moderation](anti-abuse.md) for thresholds,
failure behavior, and test credentials.

Keep phone verification disabled. Task 055 provides only disabled production and
deterministic test providers; it deliberately does not activate a paid SMS service. See
[phone verification and trust signals](phone-verification.md).

7. Validate the fully merged production configuration before building anything:

```bash
APP_ENV_FILE=.env make validate-prod
```

This rejects development build stages, users, bind mounts, published database/cache ports,
development-only services, and local/non-HTTPS public API URLs.

8. Start services:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

9. Run migrations and seed shared data:

Install the search extension once with the PostgreSQL admin role before migration `0014`:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"'
```

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend python -m scripts.seed
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend python -m scripts.create_admin --email admin@example.com --username admin --password 'Admin123!'
```

10. Confirm:

- `GET /health/live`
- `GET /health/ready`
- Homepage loads
- Registration email appears in provider logs
- Admin can approve/reject listings

Run the non-mutating post-deployment smoke from the repository checkout:

```bash
python3 ops/smoke_deployment.py \
  --app-url https://svezapecanje.rs \
  --api-url https://svezapecanje.rs
```

It checks readiness, homepage, browse, login, the public listing API, and one public
listing detail page. It does not sign in or change data and exits non-zero on failure.
Run it after every deployment before considering the release healthy.

## E2E release gate

The local Playwright suite starts isolated backend and frontend processes, recreates its
SQLite database, uses local `/tmp` image storage, queues email without contacting a
provider, and runs manual listing moderation through the real admin API. No production
email or object-storage credentials are needed.

Run the complete suite locally with one command:

```bash
cd frontend
pnpm test:e2e
```

Run only the critical registration-to-sale journey while developing:

```bash
cd frontend
pnpm test:e2e:critical
```

CI runs the complete suite three consecutive times with Playwright retries disabled.
Traces, screenshots, and video are retained and uploaded only when a run fails.

## Caddy

The production Compose override adds a `caddy` service using `ops/caddy/Caddyfile`.
Caddy terminates HTTPS and proxies:

- `/api/*` to `backend:8000`
- `/uploads/*` to `backend:8000`
- everything else to `frontend:3000`

Caddy provisions and renews TLS certificates automatically when DNS points to the VPS
and ports `80`/`443` are reachable.

## Observability

`SENTRY_DSN` enables backend and worker exception reporting. `NEXT_PUBLIC_SENTRY_DSN`
enables frontend reporting through `@sentry/nextjs`. Leave both empty in development.

Use `/health/live` for container liveness and `/health/ready` for dependency readiness.
Readiness checks PostgreSQL, Redis, and the worker heartbeat. If the worker stops writing
heartbeats for more than five minutes, readiness returns `503`.

## Backups

The production overlay starts a `backup` service. It runs `backend/scripts/backup_db.sh`
inside a `postgres:16-alpine` container, keeps seven daily dumps and four weekly dumps
in the `postgres_backups` volume, and copies them off-site when `BACKUP_REMOTE` points
to an `rclone` remote.

Example env:

```dotenv
BACKUP_REMOTE=hetzner:sve-za-pecanje/postgres
BACKUP_INTERVAL_SECONDS=86400
```

Create a manual dump when needed:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backup sh /scripts/backup_db.sh
```

List local backup files:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backup find /backups -type f -name '*.dump'
```

Restore a dump into a fresh database to verify it:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres createdb -U postgres fishing_marketplace_restore
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backup pg_restore \
  -h postgres \
  -U "${POSTGRES_USER:-postgres}" \
  -d fishing_marketplace_restore \
  --clean \
  --if-exists \
  /backups/daily/<backup-file>.dump
```

Drop the verification database after checking row counts:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres dropdb -U postgres fishing_marketplace_restore
```

Do not rely only on the same VPS disk. Configure and test the `rclone` remote before
launch, then run the manual backup command and restore one dump into
`fishing_marketplace_restore`.

## Database Credentials

Do not run the app with the `postgres` superuser or placeholder credentials. Keep
the container admin role separate from the application role:

```dotenv
POSTGRES_DB=fishing_marketplace
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-postgres-admin-password>
DATABASE_URL=postgresql+psycopg://fishing_app:<strong-app-password>@postgres:5432/fishing_marketplace
```

For an existing database volume, changing `POSTGRES_PASSWORD` in `.env` is not enough.
Rotate credentials inside PostgreSQL:

```sql
CREATE ROLE fishing_app LOGIN PASSWORD '<strong-app-password>';
GRANT CONNECT ON DATABASE fishing_marketplace TO fishing_app;
GRANT USAGE, CREATE ON SCHEMA public TO fishing_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fishing_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO fishing_app;
ALTER DATABASE fishing_marketplace OWNER TO fishing_app;
ALTER SCHEMA public OWNER TO fishing_app;
ALTER ROLE postgres PASSWORD '<strong-postgres-admin-password>';
```

If the app password contains `%` and is URL-encoded in `DATABASE_URL`, Alembic must
escape `%` before assigning the URL to its config object. This project handles that
in `db/migrations/env.py`.

## Object Storage

Production uploads should use Hetzner Object Storage:

```dotenv
S3_ENDPOINT_URL=https://fsn1.your-objectstorage.com
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=<bucket>
S3_PUBLIC_URL=https://<bucket>.fsn1.your-objectstorage.com
```

Use the correct Hetzner location in the endpoint, such as `fsn1`, `nbg1`, or `hel1`.

The app also supports the Hetzner-specific env names used in production:

```dotenv
STORAGE_BACKEND=hetzner
HETZNER_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_STORAGE_BUCKET=<bucket>
HETZNER_STORAGE_ROOT_FOLDER=sve-za-pecanje
HETZNER_STORAGE_PUBLIC_URL=https://<bucket>.fsn1.your-objectstorage.com
HETZNER_STORAGE_REGION=eu-central
HETZNER_STORAGE_ACCESS_KEY=<key>
HETZNER_STORAGE_SECRET_KEY=<secret>
HETZNER_STORAGE_FORCE_PATH_STYLE=false
HETZNER_STORAGE_ACL=public-read
HETZNER_STORAGE_SIGNED_URL_EXPIRES=900
```

When `HETZNER_STORAGE_ROOT_FOLDER` is set, uploaded listing images are written under
that prefix inside the bucket, for example `sve-za-pecanje/listings/...`.

To migrate existing local uploads after setting the Hetzner env vars:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend python -m scripts.sync_uploads_to_object_storage
```

Deleting a listing image removes the backing storage object. The worker also removes
stale local orphan files when local storage is used in development.

## Listing Drafts

Apply migration `0012_listing_drafts` before deploying the autosave-enabled frontend. No
environment changes are required. The worker permanently removes drafts that have not
been touched for 90 days; see
[listing drafts and autosave](listing-drafts.md) for lifecycle and privacy guarantees.

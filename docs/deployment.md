# Deployment

## Hetzner VPS Production

This deployment uses Docker Compose on one VPS with Caddy as the public reverse proxy.
Only Caddy should expose public HTTP/HTTPS ports. PostgreSQL, Redis, backend, frontend,
MinIO, and Mailpit should not be reachable from the public internet.

1. Provision an Ubuntu VPS.
2. Point DNS `A` and `AAAA` records for `APP_DOMAIN` to the server.
3. Install Docker Engine and a recent Docker Compose plugin. The production overlay uses
   Compose's `!reset` tag to remove development port mappings.
4. Open only SSH, HTTP, and HTTPS in the Hetzner firewall: `22`, `80`, `443`.
5. Copy `.env.example` to `.env` and replace all secrets.
6. Set production values:

```dotenv
APP_ENV=production
APP_DOMAIN=svezapecanje.rs
APP_URL=https://svezapecanje.rs
API_URL=https://svezapecanje.rs
CORS_ALLOWED_ORIGINS=https://svezapecanje.rs
NEXT_PUBLIC_API_URL=https://svezapecanje.rs/api/v1
INTERNAL_API_URL=http://backend:8000/api/v1
POSTGRES_DB=fishing_marketplace
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-postgres-admin-password>
DATABASE_URL=postgresql+psycopg://fishing_app:<strong-app-password>@postgres:5432/fishing_marketplace
```

7. Start services:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

8. Run migrations and seed shared data:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend python -m scripts.seed
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend python -m scripts.create_admin --email admin@example.com --username admin --password 'Admin123!'
```

9. Confirm:

- `GET /health`
- Homepage loads
- Registration email appears in provider logs
- Admin can approve/reject listings

## Caddy

The production Compose override adds a `caddy` service using `ops/caddy/Caddyfile`.
Caddy terminates HTTPS and proxies:

- `/api/*` to `backend:8000`
- `/uploads/*` to `backend:8000`
- everything else to `frontend:3000`

Caddy provisions and renews TLS certificates automatically when DNS points to the VPS
and ports `80`/`443` are reachable.

## Backups

Create a backups directory on the VPS:

```bash
sudo mkdir -p /opt/sve-za-pecanje/backups/postgres
sudo chown "$USER":"$USER" /opt/sve-za-pecanje/backups/postgres
```

Manual PostgreSQL dump:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U postgres \
  -d fishing_marketplace \
  --format=custom \
  --no-owner \
  --no-acl \
  > "/opt/sve-za-pecanje/backups/postgres/fishing_marketplace-$(date +%F-%H%M%S).dump"
```

Restore a dump into a fresh database:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres createdb -U postgres fishing_marketplace_restore
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U postgres \
  -d fishing_marketplace_restore \
  --clean \
  --if-exists \
  < /opt/sve-za-pecanje/backups/postgres/<backup-file>.dump
```

Daily cron example:

```cron
15 2 * * * cd /root/sve-za-pecanje && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres -d fishing_marketplace --format=custom --no-owner --no-acl > /opt/sve-za-pecanje/backups/postgres/fishing_marketplace-$(date +\%F-\%H\%M\%S).dump
45 2 * * * find /opt/sve-za-pecanje/backups/postgres -type f -name '*.dump' -mtime +14 -delete
```

Copy backups off the VPS. For example, use `rclone`, `restic`, `borg`, or another
off-server backup target. Do not rely only on the same VPS disk.

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

Local uploads currently go through `/uploads` on the backend. Before real user volume
grows, move listing images to Hetzner Object Storage by setting:

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

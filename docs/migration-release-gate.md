# Migration and storage release validation

## Why PostgreSQL is authoritative

SQLite remains useful for fast application tests and a basic Alembic upgrade/check smoke
test, but it cannot validate PostgreSQL behavior. In particular, PostgreSQL reflects
unique constraints and unique indexes differently, has dialect-specific JSONB, full-text,
trigram, and expression indexes, and enforces extension privileges that SQLite does not
have.

CI therefore exposes **PostgreSQL migration release gate** as a separate required job.
Production image builds depend on it. The gate runs PostgreSQL 16 and:

1. creates deterministic `szp_gate_admin` and `szp_gate_app` roles;
2. creates `szp_migration_gate` with the non-superuser admin role;
3. installs `unaccent` and `pg_trgm` as the database-admin role;
4. grants the application role only connect and `public` schema usage/create privileges;
5. runs `alembic upgrade head` and `alembic check` as the application role;
6. proves the application role cannot create another extension;
7. downgrades the latest revision to its parent, re-upgrades it, and runs
   `alembic check` again.

The SQLite check remains in the backend job, but a SQLite pass is not a release decision.

## Run locally

Prerequisites:

- Docker Engine with permission to run containers
- `uv`
- TCP port `55432` available on loopback

From the repository root:

```bash
make migration-gate-postgres
```

The wrapper starts an isolated `postgres:16-alpine` container named
`szp-postgres-migration-gate`, runs the same Python gate used by CI, and removes the
container afterward. Database and role names are deterministic. The local server uses
loopback-only trust authentication, so the command has no credentials to print or retain.
The Python gate rejects non-loopback hosts and any maintenance database other than
`postgres`; do not weaken that protection or pass production credentials.

CI supplies `MIGRATION_GATE_BOOTSTRAP_URL` for its own loopback PostgreSQL service. Most
developers should use the Make target rather than setting that variable.

## Migration and model conventions

- Do not use `mapped_column(unique=True, index=True)`. Declare a named `Index(...,
  unique=True)` or a named `UniqueConstraint` in `__table_args__`, then make the migration
  create exactly that object.
- Prefer a unique index when the existing deployed schema uses a unique index. PostgreSQL
  may reflect a separate unique constraint and unique index as different objects.
- Do not rewrite a migration that may already have run in a shared environment. Correct
  deployed history with a new forward migration. A migration may be fixed in place only
  while it is known not to have been deployed.
- PostgreSQL-only indexes that cannot be represented and reflected reliably through model
  metadata are registered once in
  `backend/app/db/migration_conventions.py`. Alembic's `include_object` hook imports this
  registry.
- `test_migration_conventions.py` discovers raw SQL `CREATE INDEX` statements and
  PostgreSQL GIN indexes in migration files. It requires an exact match with the managed
  registry, preventing both missing exclusions and stale entries.
- Never add an ordinary index to the managed registry merely to silence `alembic check`.
  Resolve real model/schema drift instead.

Before opening a pull request that changes models or migrations, run:

```bash
cd backend
uv run ruff check
uv run pytest
cd ..
make migration-gate-postgres
```

## Extension ownership in deployment

`unaccent` and `pg_trgm` are database prerequisites. Install them once with the
database-admin role before application migrations. The application migration role should
be `NOSUPERUSER NOCREATEDB NOCREATEROLE`, should not own the database, and should receive
only the database/schema privileges required to create and alter application-owned
objects.

Historical migrations retain `CREATE EXTENSION IF NOT EXISTS` for compatibility. Because
the extensions already exist, restricted-role migrations can traverse that history
without needing extension-creation privilege.

## Private export storage

Private account exports are encrypted by the application before upload. The S3-compatible
client first requests the optional `AES256` server-side encryption header. It retries
without that header only when a known provider error explicitly identifies that SSE
argument as unsupported. Authentication, signature, permission, invalid bucket, and
unrelated feature errors are propagated.

Unit tests enforce the fallback boundary. An optional local MinIO integration test covers
encrypted upload, read, decrypt, and deletion without external credentials:

```bash
make test-storage-minio
```

Production `.env` files and credentials remain untracked. Only `.env.example` and
`.env.*.example` templates belong in Git.

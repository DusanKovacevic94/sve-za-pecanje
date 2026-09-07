# Sve Za Pecanje

MVP for a Serbian fishing gear classifieds marketplace. The app is a monorepo with a FastAPI backend, Next.js frontend, PostgreSQL, Redis, MinIO, and Mailpit.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: http://localhost:3001
- Backend API: http://localhost:8001
- API health: http://localhost:8001/health
- Mailpit: http://localhost:8025
- MinIO: http://localhost:9001

## Optional blog CMS

The Payload foundation lives in `cms/` with a separate database on the existing
PostgreSQL instance. Configure `CMS_DATABASE_PASSWORD`, `CMS_SECRET`, and
`CMS_S3_SECRET_ACCESS_KEY` in the root
`.env`, then run `make cms-dev` (CMS only) or `make dev-with-cms` (complete stack).
Bootstrap the administrator as described in [cms/README.md](cms/README.md), then open
http://localhost:3002/admin. Article editing, editor roles, drafts, and local email
recovery are available; see [the content API guide](cms/CONTENT_API.md). Image uploads
use a dedicated S3/MinIO bucket with responsive variants and protected deletion;
see [CMS media setup](cms/MEDIA_STORAGE.md). The public blog lives at `/blog`.
Configure the two independent preview/revalidation signing secrets in both services
to enable editor previews; see [blog setup and publishing](docs/blog-publishing.md).

## Local Commands

```bash
make dev
make migrate
make seed
make create-admin EMAIL=admin@example.com USERNAME=admin PASSWORD=Admin123!
make test
make validate-prod
```

## MVP Scope

Implemented foundation:

- User registration, login, logout, `/auth/me`, email verification, and password reset (emails via Resend when `RESEND_API_KEY` is set, otherwise logged)
- Category, attribute definition, brand, city, and demo listing seed data
- Listing creation, editing, browsing, structured filtering, image upload metadata, favorites, saved searches
- Basic conversations/messages, reviews, reports, and admin moderation/audit flows
- Serbian Latin user-facing UI and API messages
- Docker Compose local development environment
- Alembic migration scaffold

This MVP intentionally does not include payments, auctions, scraping, escrow, WebSockets, mobile apps, or advanced anti-fraud automation.

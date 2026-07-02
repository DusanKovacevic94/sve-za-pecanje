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

## Local Commands

```bash
make dev
make migrate
make seed
make create-admin EMAIL=admin@example.com USERNAME=admin PASSWORD=Admin123!
make test
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

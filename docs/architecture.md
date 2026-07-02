# Architecture

Sve Za Pecanje is a monorepo with:

- `backend`: FastAPI REST API, SQLAlchemy models, Alembic migrations, seed/admin scripts
- `frontend`: Next.js app router UI in Serbian Latin
- `postgres`: primary database
- `redis`: future background/rate-limit support
- `minio`: S3-compatible image storage target for local development
- `mailpit`: local email inbox

The MVP keeps transactions offline. The platform stores listings, structured attributes, favorites, saved searches, conversations, reviews, reports, audit logs, and simple analytics events.

## Auth

The backend issues an HttpOnly cookie named by `SESSION_COOKIE_NAME`. JWTs are signed with `JWT_SECRET`. Email verification is required before listing creation.

## Email

Transactional emails (email verification, password reset, moderation notices) are sent through [Resend](https://resend.com) when `RESEND_API_KEY` is set. `EMAIL_FROM` must use a domain verified in the Resend account. Without an API key, emails are written to the backend log instead — the verification/reset links appear there during local development.

## Listings

Listings use stable slugs and `public_id`. Global fields are SQL columns; fishing-specific fields live in `attributes` JSON so categories can evolve through `attribute_definitions`.

## Moderation

`LISTING_REVIEW_MODE=manual` sends new listings to `pending_review`. Admin actions create audit logs and can approve, reject, feature, resolve reports, and suspend users.


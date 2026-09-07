# Architecture

Sve Za Pecanje is a monorepo with:

- `backend`: FastAPI REST API, SQLAlchemy models, Alembic migrations, seed/admin scripts
- `frontend`: Next.js app router UI in Serbian Latin
- `cms`: independent Payload/Next.js application for blog administration, versioned
  articles, and media uploads (tasks 072–074; public routes follow in 075)
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

## Blog CMS boundary

The marketplace frontend renders `/blog` and `/blog/[slug]` with a server-only,
anonymous published-content client. Blog data is deliberately uncached in v1;
publication is checked before HTTP rendering and again during content reads.
Scoped editor previews and signed invalidation hooks use independent secrets,
not CMS login cookies or marketplace authentication. Blog sitemap failures are
isolated from the marketplace sitemap. See [publishing and preview](blog-publishing.md).

The optional `docker-compose.cms.yml` development overlay runs Payload at
`http://localhost:3002/admin`. The planned production editor is
`https://cms.svezapecanje.rs/admin`; public articles will live in the existing
frontend at `/blog` and `/blog/[slug]`.

The PostgreSQL instance is shared, but Payload uses the dedicated `svezapecanje_cms`
database and restricted `szp_cms` role. Its generated migrations and user accounts
are independent of FastAPI/Alembic and marketplace sessions. Provisioning is an
explicit repeatable local operation, including for existing database volumes.
The CMS does not read or mutate marketplace tables. Future inventory references
will use the FastAPI interface. Media uploads use a dedicated bucket and restricted
credentials at the existing object-storage provider, never marketplace upload records
or export storage. Files and variants are public even in drafts; metadata is anonymous
only when referenced by currently published content. Referenced files cannot be deleted
while any article or retained version needs them. See [CMS media storage](../cms/MEDIA_STORAGE.md).

See [CMS setup and validation](../cms/README.md) and the
[blog implementation plan](blog-implementation-plan.md).

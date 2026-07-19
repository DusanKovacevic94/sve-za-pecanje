# Listing drafts and autosave

Listing creation uses private server-side drafts so sellers can stop and resume without
making incomplete inventory public.

## Lifecycle

1. The browser creates a draft after the first changed field, or immediately before the
   first image upload.
2. `POST /api/v1/listings/drafts` is idempotent for a seller and `client_draft_id`.
3. Debounced saves use `PATCH /api/v1/listings/drafts/{id}` with `expected_version`.
4. A stale version returns `AUTOSAVE_CONFLICT` (`409`) instead of silently overwriting a
   newer device or tab.
5. `POST /api/v1/listings/drafts/{id}/publish` runs complete listing and category-attribute
   validation, the adaptive anti-abuse check, analytics, duplicate fingerprinting,
   expiration setup, and the configured moderation transition.
6. A published draft keeps its client id so a delayed create retry cannot create a second
   listing.

The existing complete `POST /api/v1/listings` operation remains supported for older
clients.

## Privacy and product behavior

Drafts are available only through owner/admin-authenticated operations. They are excluded
from public listing/detail queries, category and shop inventory, saved-search matching,
sitemaps, promotions, public interactions, expiry notifications, moderation queues, and
marketplace supply metrics.

The creation form reports `Čuvanje…`, `Sačuvano`, offline, save-error, and conflict states.
Navigation warnings appear only while local edits have not reached the server. A session
expiry or failed request leaves the current form values intact and never shows
`Sačuvano`.

`Moji oglasi` displays drafts separately with resume and permanent-delete actions. During
the last seven days of retention, it shows the scheduled deletion date.

## Retention

The worker runs `delete_stale_listing_drafts` every cycle. It permanently removes drafts
whose `draft_last_saved_at` is older than 90 days and deletes their stored image objects.
Active, pending, sold, rejected, and archived listings are never selected.

Any successful content save or draft image operation refreshes the draft activity
timestamp.

## Listing quality guidance

The checklist is advisory and does not affect ranking or block publication. It recommends
a cover image, at least three images, a leaf category, brand and model, a useful
description, location and delivery information, and important required/searchable
category attributes.

## Deployment

Run the normal migration before deploying the new backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

Migration `0012_listing_drafts` adds the client id, optimistic version, last-saved
timestamp, and per-seller idempotency constraint. No new environment variables are
required.

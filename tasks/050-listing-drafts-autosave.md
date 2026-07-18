# 050 — Listing drafts, autosave, and quality checklist

Status: todo
Priority: P1

## Problem

Listing creation currently expects a complete valid payload. A seller who leaves the page,
loses connectivity, or needs photos from another device can lose work. The form also gives
little guidance about which details improve buyer confidence.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Add a private `draft` listing status excluded from moderation, public browse, direct
  public detail, expiration, quotas, promotions, analytics supply counts, sitemap, and
  notifications
- [ ] Add draft-specific create, partial-update, publish, and delete operations
- [ ] Keep the existing complete-listing create operation working for backward compatibility
- [ ] Create the server draft after the first meaningful form change or immediately before
  the first image upload; use a client draft ID or idempotency key to prevent duplicates
- [ ] Debounce autosave and display explicit `Čuvanje…`, `Sačuvano`, offline, and save-error
  states
- [ ] Warn on navigation only when local changes have not reached the server
- [ ] Allow drafts to be resumed or deleted from `Moji oglasi`, visually separated from
  pending, active, sold, and archived listings
- [ ] Validate the complete listing only when publishing, then move it through the existing
  moderation flow
- [ ] Add a non-blocking listing-quality checklist for cover image, at least three images,
  leaf category, brand/model, useful description, location, delivery information, and
  important category attributes
- [ ] Show specific improvement suggestions without initially using the score for ranking
- [ ] Remove untouched drafts after 90 days and show an in-product warning during the final
  seven days
- [ ] Add ownership, idempotency, autosave conflict, session expiry, image upload, publish,
  stale-draft cleanup, and E2E tests

## Acceptance criteria

- Drafts are available only to their owner and authorized administrators
- Refreshing or changing devices preserves server-saved work
- Repeated autosave requests cannot create duplicate listings
- Publishing uses the same validation, moderation, and audit behavior as existing listings
- Drafts never appear in search, public metrics, sitemap, notifications, or promotion flows
- A save failure is visible and does not falsely display `Sačuvano`

## Dependencies

- 048

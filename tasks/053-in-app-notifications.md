# 053 — In-app notification center

Status: done
Priority: P1

## Problem

The current notification work is primarily email-based. Important events have no durable
in-app destination, users can miss email, and future features such as following sellers
would otherwise create additional one-off notification behavior.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Add a user notification model with type, recipient, optional actor/entity references,
  safe display payload, deduplication key, read timestamp, and creation timestamp
- [x] Define initial notification types for:
  - new conversation or message
  - listing approved, rejected, expiring, expired, reserved, or sold
  - saved-search matches
  - review received
  - promotion, shop-subscription, or moderation status changes
- [x] Produce notifications from domain services or idempotent worker tasks rather than
  scattered frontend calls
- [x] Add cursor-paginated list, unread-count, mark-one-read, and mark-all-read operations
- [x] Enforce recipient ownership and avoid leaking a deleted/private entity through
  notification payloads
- [x] Add a header bell with unread count and a dedicated notification page
- [x] Link each notification to the relevant accessible entity and fall back to safe generic
  text when the entity is no longer available
- [x] Poll only while the page is visible and refresh immediately when the window regains
  focus; do not add WebSockets or web push in this task
- [x] Consolidate bursts, particularly multiple messages in one conversation and multiple
  saved-search matches
- [x] Keep critical in-app notifications enabled while respecting existing email
  preferences for corresponding email delivery
- [x] Retain notifications for 180 days and delete them in bounded worker batches
- [x] Add deduplication, worker retry, pagination, ownership, unread count, multi-tab,
  inaccessible entity, accessibility, and E2E tests

## Acceptance criteria

- Retried jobs or duplicate domain events create at most one logical notification
- Unread counts remain correct after reading from another tab or device
- A notification never exposes another user's private data
- Missing entities render safe text instead of a broken page
- The center works without real-time infrastructure and creates no polling requests while
  the tab is hidden

## Dependencies

- 047

## Verification

- `uv run ruff check app scripts db/migrations/versions/0015_in_app_notifications.py`
- `uv run pytest -q` — 72 passed
- migration upgrade → downgrade → upgrade on a clean SQLite database
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e` — 7 passed
- critical marketplace E2E verifies the bell, accessible feed, and cross-tab read
  synchronization
- notification E2E verifies that hidden tabs make no polling requests and refresh when
  visible

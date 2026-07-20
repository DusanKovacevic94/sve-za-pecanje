# 051 — Price flexibility, delivery options, and reservation state

Status: done
Priority: P1

## Problem

Every listing currently behaves like a fixed-price item even though classifieds commonly use
negotiation, gifts, or a price agreed in conversation. Listings also do not state how the
item can be handed over, and sellers cannot visibly reserve an item while completing an
offline transaction.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Add stable `price_type` values: `fixed`, `negotiable`, `on_request`, and `free`
- [x] Require `price_amount` for fixed/negotiable listings and store no amount for
  on-request/free listings
- [x] Backfill all existing listings as `fixed` without changing their displayed amount
- [x] Add repeatable delivery methods with stable values for personal pickup, courier, and
  arrangement with seller, plus an optional delivery note
- [x] Use Serbian UI labels: `Fiksna cena`, `Cena po dogovoru`, `Na upit`, `Poklanjam`,
  `Lično preuzimanje`, `Kurirska služba`, and `Dogovor sa prodavcem`
- [x] Add a reversible `reserved` listing state controlled by the owner or administrator
- [x] Add reserve/unreserve operations and keep the existing mark-sold operation as the
  terminal successful state
- [x] Keep reserved listings publicly visible with a prominent `Rezervisano` label, but
  exclude them from renewal and new promotion purchases
- [x] Display price type and delivery consistently in listing forms, cards, detail pages,
  seller management, messages, and structured metadata
- [x] Add price-type and delivery filters to browse, active chips, URLs, saved searches,
  matching counts, and digest matching
- [x] Update API schemas and generated frontend types additively so older clients continue
  to receive valid listing data
- [x] Add migration, validation, state-transition, filter, saved-search, serialization, and
  E2E tests

## Acceptance criteria

- Existing listings continue to display the same price after migration
- Invalid amount/type combinations return field-specific Serbian validation messages
- Only the owner or administrator can reserve, unreserve, or sell a listing
- Reserved listings remain discoverable but cannot be renewed or newly promoted
- Delivery and price filters produce the same results in live browse and saved-search
  matching
- No onsite payment, escrow, courier booking, or sales-commission behavior is introduced

## Dependencies

- 050

## Verification

- `uv run ruff check app db/migrations/versions/0013_listing_handoff_options.py`
- `uv run pytest -q` — 61 passed
- migration upgrade → downgrade → upgrade on a clean SQLite database
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e:critical` — 1 passed

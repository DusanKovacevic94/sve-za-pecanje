# 051 — Price flexibility, delivery options, and reservation state

Status: todo
Priority: P1

## Problem

Every listing currently behaves like a fixed-price item even though classifieds commonly use
negotiation, gifts, or a price agreed in conversation. Listings also do not state how the
item can be handed over, and sellers cannot visibly reserve an item while completing an
offline transaction.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Add stable `price_type` values: `fixed`, `negotiable`, `on_request`, and `free`
- [ ] Require `price_amount` for fixed/negotiable listings and store no amount for
  on-request/free listings
- [ ] Backfill all existing listings as `fixed` without changing their displayed amount
- [ ] Add repeatable delivery methods with stable values for personal pickup, courier, and
  arrangement with seller, plus an optional delivery note
- [ ] Use Serbian UI labels: `Fiksna cena`, `Cena po dogovoru`, `Na upit`, `Poklanjam`,
  `Lično preuzimanje`, `Kurirska služba`, and `Dogovor sa prodavcem`
- [ ] Add a reversible `reserved` listing state controlled by the owner or administrator
- [ ] Add reserve/unreserve operations and keep the existing mark-sold operation as the
  terminal successful state
- [ ] Keep reserved listings publicly visible with a prominent `Rezervisano` label, but
  exclude them from renewal and new promotion purchases
- [ ] Display price type and delivery consistently in listing forms, cards, detail pages,
  seller management, messages, and structured metadata
- [ ] Add price-type and delivery filters to browse, active chips, URLs, saved searches,
  matching counts, and digest matching
- [ ] Update API schemas and generated frontend types additively so older clients continue
  to receive valid listing data
- [ ] Add migration, validation, state-transition, filter, saved-search, serialization, and
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

# Listing handoff options

Task 051 adds explicit price flexibility, delivery choices, and a reversible reservation
state without introducing onsite payments, escrow, courier booking, or commission logic.

## Stable values

Price types:

- `fixed` — `Fiksna cena`; a positive amount is required
- `negotiable` — `Cena po dogovoru`; a positive asking amount is required
- `on_request` — `Na upit`; no amount is stored
- `free` — `Poklanjam`; no amount is stored

Delivery methods:

- `personal_pickup` — `Lično preuzimanje`
- `courier` — `Kurirska služba`
- `seller_arrangement` — `Dogovor sa prodavcem`

The delivery methods are repeatable and the optional `delivery_note` is limited to 500
characters. API clients should send repeated `price_type` and `delivery_method` query
parameters when selecting multiple filter values.

## Reservation lifecycle

`active → reserved → active` is reversible and controlled by the listing owner or an
administrator. Both `active` and `reserved` are public states: reserved listings stay in
browse, seller pages, shops, saved-search matches, favorites, similar listings, and
messages.

Both public states can transition to `sold`. A reservation is cleared when a listing is
sold, archived, suspended with its seller, expires, or is sent back to moderation after a
major edit. Reserved listings cannot be renewed and cannot create new promotion orders.
Already-paid homepage placement remains visible while the listing is reserved.

State changes are recorded in the audit log as `listing.reserved`,
`listing.unreserved`, and `listing.sold`.

## Deployment

No environment variable changes are required. Deploy the backend migration before or
together with the application:

```bash
cd backend
uv run alembic upgrade head
```

Migration `0013_listing_handoff_options` backfills every existing listing to `fixed`
without modifying its amount. It adds nullable price amounts for on-request/free listings,
delivery fields, and reservation fields. The migration is reversible, although downgrade
uses `0` for amount-less listings because the earlier schema requires an amount.

After deployment, verify:

1. An existing listing still shows its previous price.
2. A negotiable listing can be found with `price_type=negotiable`.
3. A courier listing can be found with `delivery_method=courier`.
4. A reserved listing remains public and messageable.
5. Renewal and new promotion requests for that reserved listing are rejected.

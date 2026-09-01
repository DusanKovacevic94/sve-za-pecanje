# 067 — Listing-card information hierarchy

Status: todo
Priority: P1

## Goal

Make marketplace scanning faster by reducing badge noise and prioritizing facts
that help a buyer decide whether to open a listing.

## Work

- [ ] Define a fixed hierarchy for image, status, title, price, condition,
  location, seller/trust, and category-specific attributes.
- [ ] Limit visible attribute pills and remove redundant price/delivery metadata.
- [ ] Standardize card height and spacing across sparse and detailed listings.
- [ ] Preserve featured, reserved, sold, shop, favorite, and no-photo states.
- [ ] Review 320 px list/grid and large desktop grids.

## Acceptance criteria

- A normal card shows no more than three secondary metadata treatments.
- Price, title, condition, and location remain immediately scannable.
- Cards do not jump substantially in height because one listing has more data.
- Status meaning remains available without relying on color alone.

## Primary files

- `frontend/src/components/listings/ListingCard.tsx`
- `frontend/src/components/ui/Badge.tsx`


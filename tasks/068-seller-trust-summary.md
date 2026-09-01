# 068 — Seller trust summary and semantic metrics

Status: todo
Priority: P2

## Goal

Present verified seller facts as a coherent decision aid rather than a mixed
collection of listing and seller statistics.

## Work

- [ ] Separate listing engagement metrics from seller trust metrics.
- [ ] Use semantically correct icons for active listings and completed sales.
- [ ] Prioritize verification, rating, completed sales, and membership age.
- [ ] Define compact and full variants for cards, detail, and seller pages.
- [ ] Keep the disclaimer that trust indicators are not transaction guarantees.

## Acceptance criteria

- No favorite icon represents listing count or seller inventory.
- Listing views do not appear as a seller-quality metric.
- Trust information is factual, consistently ordered, and accessible.
- Compact presentation does not overwhelm listing-card hierarchy.

## Primary files

- `frontend/src/components/trust/TrustIndicators.tsx`
- `frontend/src/app/oglasi/[slug]/page.tsx`
- `frontend/src/app/prodavci/[username]/page.tsx`


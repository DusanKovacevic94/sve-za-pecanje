# 068 — Seller trust summary and semantic metrics

Status: done
Priority: P2

## Goal

Present verified seller facts as a coherent decision aid rather than a mixed
collection of listing and seller statistics.

## Work

- [x] Separate listing engagement metrics from seller trust metrics.
- [x] Use semantically correct icons for active listings and completed sales.
- [x] Prioritize verification, rating, completed sales, and membership age.
- [x] Define compact and full variants for cards, detail, and seller pages.
- [x] Keep the disclaimer that trust indicators are not transaction guarantees.

## Acceptance criteria

- No favorite icon represents listing count or seller inventory.
- Listing views do not appear as a seller-quality metric.
- Trust information is factual, consistently ordered, and accessible.
- Compact presentation does not overwhelm listing-card hierarchy.

## Primary files

- `frontend/src/components/trust/TrustIndicators.tsx`
- `frontend/src/app/oglasi/[slug]/page.tsx`
- `frontend/src/app/prodavci/[username]/page.tsx`

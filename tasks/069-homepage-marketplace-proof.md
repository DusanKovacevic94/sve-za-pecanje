# 069 — Homepage marketplace proof and hero refinement

Status: todo
Priority: P2

## Goal

Make the homepage demonstrate an active specialist marketplace instead of
depending on a second oversized logo for identity.

## Work

- [ ] Replace the hero logo repetition with a clear customer-value headline.
- [ ] Add real listing/category proof using marketplace content, not stock art.
- [ ] Preserve the waterline motif, search prominence, and restrained Orange.
- [ ] Improve empty-data behavior so the hero never looks unfinished.
- [ ] Validate LCP, responsive image behavior, and crawlable heading structure.

## Acceptance criteria

- The header remains the primary full-logo placement above the fold.
- The hero explains what the marketplace offers in one scan.
- Visual proof uses real or deterministic marketplace content.
- Mobile search and posting actions remain prominent.

## Primary files

- `frontend/src/app/page.tsx`
- `frontend/src/components/listings/ListingCard.tsx`
- `frontend/src/components/brand/`


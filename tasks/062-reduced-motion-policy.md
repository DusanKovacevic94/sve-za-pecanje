# 062 — Reduced-motion policy and implementation

Status: done
Priority: P1

## Goal

Keep motion brief and functional while fully respecting reduced-motion user
preferences.

## Work

- [x] Inventory lifts, zooms, rotations, fades, pulsing skeletons, and spinners.
- [x] Apply `motion-safe` and `motion-reduce` behavior to shared primitives.
- [x] Remove nonessential movement when reduced motion is requested.
- [x] Preserve immediate non-motion hover/focus feedback.
- [x] Add a reduced-motion Playwright assertion for representative components.

## Acceptance criteria

- Card/image hover transforms do not run under `prefers-reduced-motion: reduce`.
- Skeletons do not pulse under reduced motion.
- Loading progress remains understandable without animation.
- Focus and state changes remain visible without movement.

## Primary files

- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/listings/ListingCard.tsx`
- `frontend/src/components/listings/ListingGallery.tsx`
- `frontend/src/styles/globals.css`

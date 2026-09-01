# 063 — Mobile listing contact actions

Status: done
Priority: P1

## Goal

Let buyers understand price, trust, and the next action without scrolling past
the complete listing description on mobile.

## Work

- [x] Reorder mobile listing information around buyer decision priority.
- [x] Add a mobile sticky action bar for message, favorite, and relevant status.
- [x] Keep desktop seller/contact content in the sticky side panel.
- [x] Handle owner, sold, reserved, blocked-contact, and anonymous states.
- [x] Prevent the sticky bar from obscuring page content or system navigation.

## Acceptance criteria

- The main contact action is available within the first mobile viewport or its
  persistent action bar.
- Price and listing status remain visible with the action.
- All state variants expose correct labels and destinations.
- Desktop layout and structured data remain unchanged.

## Primary files

- `frontend/src/app/oglasi/[slug]/page.tsx`
- `frontend/src/components/listings/ListingActions.tsx`
- `frontend/e2e/critical-marketplace.spec.ts`

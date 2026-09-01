# 060 — Responsive header accessibility and navigation

Status: done
Priority: P0

## Goal

Make the primary navigation and posting CTA understandable, reachable, and
stable at every supported viewport and authentication state.

## Work

- [x] Give every icon-only header action a persistent accessible name.
- [x] Prevent the logged-in desktop action cluster from colliding with primary
  navigation at medium widths.
- [x] Keep mobile navigation items from shrinking and expose them as a semantic
  navigation region.
- [x] Preserve the anonymous redirect from `Postavi oglas` to authentication.
- [x] Add focused mobile browser coverage for the posting CTA.

## Acceptance criteria

- At 320–639 px, the posting CTA has the accessible name `Postavi oglas`.
- Header controls do not wrap or overlap at 320, 390, 768, 1024, and 1280 px.
- Mobile navigation remains keyboard accessible and horizontally scrollable.
- Anonymous and authenticated posting destinations remain correct.
- Frontend lint, build, and focused Playwright coverage pass.

## Primary files

- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/HeaderNavLink.tsx`
- `frontend/src/components/layout/NotificationBell.tsx`
- `frontend/src/components/layout/UnreadMessagesLink.tsx`
- `frontend/e2e/smoke.spec.ts`

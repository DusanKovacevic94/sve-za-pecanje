# 059 — Custom SVG icon system

Status: done
Priority: P1

## Goal

Replace the Lucide dependency and the remaining icon-like text glyphs with an
original, minimal SVG family that belongs to Sve Za Pecanje.

## Work

- [x] Add the shared 24×24 SVG foundation, semantic types, and grouped exports.
- [x] Draw the complete UI, brand, and top-level category catalog.
- [x] Replace Lucide imports across public, account, messaging, and admin UI.
- [x] Replace the filter chevrons and removable-filter multiplication sign.
- [x] Update the favicon, Apple icon, PNG fallback, and Open Graph brand mark.
- [x] Add a development catalog and automated structural/accessibility coverage.
- [x] Remove `lucide-react` and prevent it from being reintroduced.
- [x] Run lint, TypeScript, production build, and Playwright validation.

## Acceptance criteria

- No `lucide-react` imports or dependency entries remain.
- All application icons use the shared custom icon interface and `currentColor`.
- Ten root categories have explicit, meaningful fishing-specific artwork.
- Decorative SVGs stay out of the accessibility tree and icon-only controls
  keep their existing accessible names.
- Brand artwork is consistent in the UI, favicon variants, and Open Graph image.
- Existing interaction behavior and layouts remain unchanged.

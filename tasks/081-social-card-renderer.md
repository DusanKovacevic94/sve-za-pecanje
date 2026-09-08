# 081 — Deterministic SVG-to-JPEG social card renderer

Status: todo
Priority: P2

## Goal

Generate predictable, production-quality JPEGs from the approved editable SVG
template and validated social copy, without publishing or publicly storing drafts.

## Work

- [ ] Implement a CMS-side renderer using the approved template and local font/logo
  assets. Evaluate reuse of the existing Sharp dependency before adding another renderer.
- [ ] Accept a small typed plain-text input contract; use 080's limits and typography.
  Wrap using font-aware measurements, preserving Serbian characters. Return actionable
  overflow errors instead of clipping, arbitrary truncation, or unreadably small text.
- [ ] Escape interpolated XML text; reject arbitrary SVG/HTML, external asset URLs,
  file paths, and unbounded inputs. Rendering must not fetch user-supplied resources.
- [ ] Produce a 1080 × 1350 JPEG with an opaque background and documented quality/size
  budget. Keep the SVG source editable and the preview/download render path shared.
- [ ] Bound rendering resources and concurrency. Keep generated drafts in memory or
  scoped temporary storage with cleanup; do not use the public CMS media bucket.
- [ ] Add deterministic rendering tests and verify bundled assets/fonts in the actual
  production CMS image, not only on the developer machine.

## Acceptance criteria

- The same inputs and template version produce consistent output in the pinned runtime.
- JPEG dimensions, decoding, typography, and approved layout pass automated checks.
- Boundary-length text, diacritics, XML-like input, missing assets, and renderer errors
  are covered. Failures do not affect article saving or publication.
- Rendering needs no Meta credentials, external requests, or new database service.

## Primary files

`cms/src/` (new social renderer module), `cms/tests/`, `cms/package.json`,
`cms/Dockerfile`, managed template/font assets as determined by 080.

## Dependencies

080; existing CMS image processing from 074.

# 081 — Deterministic SVG-to-JPEG social card renderer

Status: done
Priority: P2

## Goal

Generate predictable, production-quality JPEGs from the approved editable SVG
template and validated social copy, without publishing or publicly storing drafts.

## Work

- [x] Implement a CMS-side renderer using the approved template and local font/logo
  assets. Evaluate reuse of the existing Sharp dependency before adding another renderer.
- [x] Accept a small typed plain-text input contract; use 080's limits and typography.
  Wrap using font-aware measurements, preserving Serbian characters. Return actionable
  overflow errors instead of clipping, arbitrary truncation, or unreadably small text.
- [x] Escape interpolated XML text; reject arbitrary SVG/HTML, external asset URLs,
  file paths, and unbounded inputs. Rendering must not fetch user-supplied resources.
- [x] Produce a 1080 × 1350 JPEG with an opaque background and documented quality/size
  budget. Keep the SVG source editable and the preview/download render path shared.
- [x] Bound rendering resources and concurrency. Keep generated drafts in memory or
  scoped temporary storage with cleanup; do not use the public CMS media bucket.
- [x] Add deterministic rendering tests and verify bundled assets/fonts in the actual
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

## Implementation and verification — 2026-09-08

- [Server-only API and deployment guide](../cms/SOCIAL_CARD_RENDERER.md). Reused Sharp
  for JPEGs; its embedded-font fallback was demonstrated locally. Pinned Fontkit shapes
  the bundled Manrope variable font into paths while preserving editable SVG output.
- Strict two-field input, normalization/glyph/overflow checks, escaped literal XML,
  hash-verified assets, fixed dimensions, and a 1 MB JPEG budget. No user resource URLs
  or SVG source are accepted; XML-like copy is displayed literally, not interpreted.
- Disposable subprocesses: maximum two concurrent renders per CMS process, no queue,
  ten-second deadline, abort/crash recovery, 128 MB JS heap cap, no inherited credentials,
  no disk writes or public storage. Native memory still needs deployment-level limits.
- Bundles and assets are packaged with the existing standalone build; CI verifies the
  actual runner image offline/read-only/non-root with memory/CPU/PID limits and stores
  synthetic evidence. No new database/service, publication hook, or CMS route was added.
- CMS lint/typecheck, **17/17 unit tests**, standalone build, and production-image
  rendering pass. Three production cases produce identical JPEGs across repeated runs;
  their full-size and phone outputs were reviewed. Asset release/brand checks pass.
- Dependency audit passes the high-severity threshold; two moderate advisories remain.
- [Brand review: approve_with_notes](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-08-social-card-renderer.md).

Next: 082 social copy fields, then 083 private preview/download. No production access,
deployment, public uploads, or social publishing was performed.

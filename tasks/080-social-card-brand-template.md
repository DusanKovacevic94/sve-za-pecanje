# 080 — Branded social card template and review

Status: done
Priority: P2

## Goal

Approve one reusable 1080 × 1350 portrait SVG template for blog cards intended for
Instagram and Facebook, before implementing CMS functionality.

## Work

- [x] Follow the linked Brand Manager brief and brief-to-delivery workflow. Compare
  two layout directions within the requested centered-title composition and choose one.
- [x] Reuse the unchanged approved logo, Manrope, Pine, Cream, and restrained Orange.
  Include a centered title, short description, and the CTA
  `Pročitaj ceo tekst na svezapecanje.rs`. Keep the blog framing topic-neutral.
- [x] Specify safe margins, logo clear space, font weights/sizes, line counts, content
  limits, and overflow behavior for the renderer and CMS fields. Do not solve long
  copy by shrinking below the reviewed minimum readable size.
- [x] Review short, maximum-length, long-word, punctuation, and Serbian-diacritic
  examples at full resolution and a phone-sized display. Keep key content clear
  of edges; do not claim guaranteed platform crop behavior.
- [x] Store editable source, examples, and formal review in the Brand Manager.
  Register approved reusable source/assets with the existing synchronization and
  receipt process where applicable; never hand-edit protected application copies.

## Acceptance criteria

- A self-contained template and explicit layout/content contract exist; no external
  network fonts or image dependencies are required at render time.
- Title, description, CTA, and logo remain readable without clipping or overlap.
- The formal brand review approves the selected design with no unresolved P0/P1 issues.
- Brand validation passes; protected logo hashes remain unchanged.

## Primary files

Brand Manager: `work/briefs/2026-09-08-social-blog-cards.md`, `work/reviews/`,
`work/deliverables/`, `assets/`, `brand-manager.config.json` as applicable.

## Dependencies

Existing brand system and task 079.
[Brand brief](../../sve-za-pecanje-brand-manager/work/briefs/2026-09-08-social-blog-cards.md).

## Implementation and verification — 2026-09-08

- Selected the full-Pine editorial composition after comparing it with a Cream inset
  alternative. Both keep the requested centered title and untouched approved logo.
- [Editable examples and layout contract](../../sve-za-pecanje-brand-manager/work/deliverables/2026-09-08-social-blog-cards/README.md):
  1080 × 1350, 96 px safe margins, fixed Manrope sizes, title up to 100 characters /
  four lines, description up to 180 characters / four lines, measured-width overflow
  rejected with shorter-copy guidance. Limits never imply every string will fit.
- Bundled the unmodified, pinned Manrope variable font and OFL license. Synchronized
  four new assets into `cms/assets/social/` and regenerated the managed-asset receipt.
- The reproducible local design proof passes seven full-size/phone examples, bounds,
  JPEG dimensions/size, XML escaping, NFC, negative length/width/control cases,
  deterministic SVG assembly, and original logo/font hashes with network blocked.
- Brand validator, asset synchronization/release checks, CMS lint/types/build, and
  whitespace checks pass. No application runtime behavior or screenshots changed.
- [Brand verdict: approve_with_notes](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-08-social-blog-card-template.md).
  Production renderer validation and external-post accessibility remain explicit later
  task requirements. The design-proof script is not a production renderer.

Tasks 081–084 remain open. No CMS fields, preview endpoint, or social publishing has
been implemented. Nothing was committed, pushed, deployed, or posted externally.

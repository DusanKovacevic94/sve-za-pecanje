# 082 — CMS social copy fields and draft access

Status: done
Priority: P2

## Goal

Let editors prepare optional social-card copy without changing the public article
title, excerpt, SEO metadata, or publication workflow.

## Work

- [x] Add optional `socialTitle` and `socialDescription` fields to Posts, with limits
  and editor guidance derived from 080. Reuse existing CMS role/access conventions.
- [x] Default effective card copy to the article title and excerpt when overrides are
  blank. Explain that an article's longer text may need a shorter social override.
- [x] Keep fields in normal drafts, autosaves, versions, and recovery. Social fields
  remain editor-only and are excluded from anonymous/public content responses.
- [x] Distinguish field validation from card readiness: missing/overlong fallback copy
  can prevent generating a card but must not introduce a social-readiness requirement
  for saving or publishing an otherwise valid article.
- [x] Add an explicit migration, generated Payload types/schema snapshots, and focused
  access/version tests using the repository's existing migration workflow.

## Acceptance criteria

- Existing articles work without backfilling new required data.
- Editors can save, reload, clear, and recover overrides; blank overrides restore fallback.
- Anonymous clients cannot read social draft fields through REST, relationships, versions,
  or other enabled API paths. Public article content/SEO is unchanged.
- Migration and draft/publish regression tests pass against isolated PostgreSQL.

## Primary files

`cms/src/collections/Posts.ts`, `cms/src/payload-types.ts`, `cms/src/migrations/`,
`cms/src/content.ts` and public serializers as applicable, `cms/tests/`.

## Dependencies

080; existing editorial access/version model from 073 and 076.

## Implementation and verification — 2026-09-08

- Added editor/admin-only optional fields with 100/180-character limits, Serbian
  guidance, NFC/whitespace normalization, and independent title/excerpt fallbacks.
  Render readiness is not part of article publication; no render endpoint is added.
- Migration `20260908_105018_social_copy_fields` adds nullable canonical and version
  columns without a backfill. Apply it before deploying the updated CMS. Rollback
  drops only social overrides; see `cms/README.md` for the data-loss caveat.
- CMS lint, typecheck, production build and all 19 unit tests passed. Full isolated
  PostgreSQL/MinIO/Mailpit integration passed: legacy-row upgrade, rollback/re-upgrade,
  private REST/version access, override recovery/clearing, publication with long
  fallback copy, real editor browser, public HTML/SEO, inventory and analytics.
- Fixed media-test fixture cleanup: restoring a published version had left a live
  test post behind before the blog empty-state check. The harness now also asserts
  that earlier checks leave no published posts.
- Public blog unit tests (4), managed brand release checks and Brand Manager
  validation passed. No deployment, Meta integration or production access occurred.
- Brand review and synthetic editor screenshot:
  `../sve-za-pecanje-brand-manager/work/reviews/2026-09-08-cms-social-copy-fields.md`.

Next: 083 — private CMS social preview and download.

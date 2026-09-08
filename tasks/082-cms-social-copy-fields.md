# 082 — CMS social copy fields and draft access

Status: todo
Priority: P2

## Goal

Let editors prepare optional social-card copy without changing the public article
title, excerpt, SEO metadata, or publication workflow.

## Work

- [ ] Add optional `socialTitle` and `socialDescription` fields to Posts, with limits
  and editor guidance derived from 080. Reuse existing CMS role/access conventions.
- [ ] Default effective card copy to the article title and excerpt when overrides are
  blank. Explain that an article's longer text may need a shorter social override.
- [ ] Keep fields in normal drafts, autosaves, versions, and recovery. Social fields
  remain editor-only and are excluded from anonymous/public content responses.
- [ ] Distinguish field validation from card readiness: missing/overlong fallback copy
  can prevent generating a card but must not introduce a social-readiness requirement
  for saving or publishing an otherwise valid article.
- [ ] Add an explicit migration, generated Payload types/schema snapshots, and focused
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

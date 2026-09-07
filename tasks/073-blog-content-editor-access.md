# 073 — Blog content model and editor access

Status: done
Priority: P1

## Goal

Give administrators and editors a complete, protected article workflow.

## Work

- [x] Define posts, public author profiles, and media metadata collections. Post fields:
  title, unique slug, excerpt, rich-text body, author, cover image, SEO title/description,
  first publication time, substantive update time, and optional marketplace category slug.
- [x] Use a constrained rich-text feature set: headings, paragraphs, lists, quotes,
  links, and images/captions. Exclude executable code, raw HTML, and arbitrary embeds.
- [x] Enable drafts, autosave, and version recovery. Configure retention explicitly.
- [x] Validate complete reader-facing fields on publish while permitting incomplete
  drafts. Preserve first publication time; freeze slugs after first publication.
- [x] Configure administrator/editor permissions: admins manage accounts; editors manage
  content and publish. Reject public user creation and editor role escalation via APIs.
- [x] Preserve administrator-only account unlock when adding editors. The foundation
  currently treats every CMS account as an administrator; authenticated-only unlock
  must become an explicit role check with negative editor tests (Payload 3.88 advisory).
- [x] Limit anonymous reads to published articles and intended public author/media fields.
  Audit REST and any enabled GraphQL, relationship expansion, versions, and draft queries.
- [x] Configure CMS-only cookies, explicit trusted origins, login throttling, logout,
  and password reset through the existing mail provider account with CMS configuration.
  Use local email capture in development/tests; keep marketplace sessions independent.
- [x] Document the content API contract and add deterministic local fixtures.

## Acceptance criteria

- An editor can save, reopen, recover, publish, and unpublish an article.
- Saving a draft revision does not replace the previously published version.
- Anonymous requests cannot read drafts, versions, account emails, or privileged fields,
  including through query flags, IDs, relationships, or alternate enabled APIs.
- Editors cannot create administrators or change roles; bootstrap is unavailable publicly.
- Slug collisions and changes to previously published slugs are rejected server-side.
- Account recovery and access-control tests run without external mail delivery.

## Primary files

`cms/src/collections/`, `cms/src/access/`, `cms/src/migrations/`, `cms/tests/`.

## Dependencies

072. Content and copy constraints: [blog plan](../docs/blog-implementation-plan.md).

## Implementation and verification (2026-09-07)

- See [the API/editorial contract](../cms/CONTENT_API.md) for fields, access matrix,
  draft/publish/unpublish/recovery calls, email configuration, and fixture commands.
- Posts retain 50 versions with 1.5-second autosave. The rich-text vocabulary is
  constrained in the UI and checked server-side. Media metadata is implemented;
  actual file uploads and URLs remain task 074.
- Migration `20260907_094724_editorial_content` preserves foundation administrators.
  New accounts default to editor; bootstrap explicitly creates an administrator.
- Lint, TypeScript, five unit tests, standalone build, dependency audit at the high
  threshold, and production Compose configuration validation pass.
- Disposable PostgreSQL/Mailpit integration verifies empty/existing migrations and
  rollback/re-upgrade, legacy admin preservation, private idempotent fixtures, editor
  page rendering, drafts/autosave/recovery and retention, publish/unpublish, frozen
  slugs/first-publication time, relationship/query privacy, denied role escalation,
  password strength, throttling, administrator-only unlock, recovery, and logout.
- The integration suite also runs against the non-root standalone image. A separate
  Compose rehearsal verifies fresh startup and repeat provisioning/migrations.
- The unrelated marketplace brand release check currently fails on CRLF line endings
  in five pre-existing icon files. Those files have no Git diff, and all five hashes
  match the manifest after LF normalization. No brand assets were modified here.

Production mail credentials, DNS, and deployment were not configured or exercised.
Tests deliver email only to isolated local Mailpit and remove their synthetic resources.

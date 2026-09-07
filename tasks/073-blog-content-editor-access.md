# 073 — Blog content model and editor access

Status: todo
Priority: P1

## Goal

Give administrators and editors a complete, protected article workflow.

## Work

- [ ] Define posts, public author profiles, and media metadata collections. Post fields:
  title, unique slug, excerpt, rich-text body, author, cover image, SEO title/description,
  first publication time, substantive update time, and optional marketplace category slug.
- [ ] Use a constrained rich-text feature set: headings, paragraphs, lists, quotes,
  links, and images/captions. Exclude executable code, raw HTML, and arbitrary embeds.
- [ ] Enable drafts, autosave, and version recovery. Configure retention explicitly.
- [ ] Validate complete reader-facing fields on publish while permitting incomplete
  drafts. Preserve first publication time; freeze slugs after first publication.
- [ ] Configure administrator/editor permissions: admins manage accounts; editors manage
  content and publish. Reject public user creation and editor role escalation via APIs.
- [ ] Preserve administrator-only account unlock when adding editors. The foundation
  currently treats every CMS account as an administrator; authenticated-only unlock
  must become an explicit role check with negative editor tests (Payload 3.88 advisory).
- [ ] Limit anonymous reads to published articles and intended public author/media fields.
  Audit REST and any enabled GraphQL, relationship expansion, versions, and draft queries.
- [ ] Configure CMS-only cookies, explicit trusted origins, login throttling, logout,
  and password reset through the existing mail provider account with CMS configuration.
  Use local email capture in development/tests; keep marketplace sessions independent.
- [ ] Document the content API contract and add deterministic local fixtures.

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

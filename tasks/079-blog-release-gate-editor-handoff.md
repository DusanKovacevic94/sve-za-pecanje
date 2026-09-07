# 079 — Blog release gate and editor handoff

Status: done

## Historical release blockers recorded during 075–076 (resolved below)

- The existing critical marketplace browser journey times out on `/nalog/oglasi`:
  the footer overlaps the `Rezerviši` button. The listing/card layout was not edited
  in the blog tasks; regression origin is not yet established. Diagnose, fix and
  rerun before release. Local evidence: `frontend/playwright-report/blog-regression/`.
- The asset-release validator reports raw-byte hash drift for five unchanged icon
  TypeScript files. All five match after CRLF→LF normalization and have no Git diff.
  Resolve checkout/receipt line-ending handling without changing approved logos.
- Review intentional site-wide visual baseline changes for the added Blog navigation;
  the blog integration captures are reviewed evidence, not automatically blessed baselines.

[Scoped blog review](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-07-blog-pages-preview.md).
Priority: P1

## Goal

Prove the complete editorial journey and document everyday operation before rollout.

## Work

- [x] Add CMS lint/types/build, PostgreSQL migration/access checks, and focused CMS tests
  to CI. Keep the existing marketplace and brand release gates required.
- [x] Extend isolated browser fixtures with CMS PostgreSQL and MinIO; scope setup/cleanup
  to explicit test resources, separate from developer data and other migration gates.
- [x] Exercise administrator bootstrap, editor login, image upload, draft/autosave/recovery,
  preview, publish, related inventory navigation, draft revision, and unpublish.
- [x] Run cache-sensitive publishing tests against production builds, including outage,
  missed-hook recovery, stale cache removal, and draft exposure regression cases.
- [x] Cover blog canonical URLs, sitemap, structured data, responsive layout, keyboard
  use, and image behavior. Add reviewed deterministic visual baselines where useful.
- [x] Write an editor guide for images/credits/alt text, public draft-image visibility,
  author details, SEO fields, immutable slugs, revisions, publishing, and withdrawal.
- [x] Review privacy disclosures and 077 analytics configuration before enabling live
  collection. Keep staging/smoke tests disabled, record excluded fixture IDs, and verify
  the admin-only blog report without presenting clicks as seller contacts or sales.
- [x] Record final brand review in the Brand Manager and link its verdict in release
  evidence. Document a first real article checklist without publishing test content.
- [x] Update README/architecture/deployment docs and the task index after checks pass.

## Acceptance criteria

- CI proves the editorial journey with isolated synthetic data and no production secrets.
- Both CMS and marketplace migrations/checks pass; production images build and smoke-test.
- A reviewer can follow the guide to prepare and preview an article without code changes.
- Release evidence records commands/results, brand verdict, remaining issues, and manual
  rollout steps. No P0/P1 blog issues remain before marking the release ready.
- Actual DNS changes, production deployment, and first-article publication remain a
  separate explicitly authorized operational action.

## Primary files

`.github/workflows/ci.yml`, `cms/tests/`, `frontend/e2e/`,
`docs/blog-editor-guide.md`, `docs/blog-release-checklist.md`, `tasks/README.md`.

## Verification and handoff — 2026-09-07

- Added the isolated CMS editorial/recovery CI gate and kept backend, PostgreSQL,
  marketplace and strict brand validation required for production-image checks.
- Real CMS editor browser actions cover upload, autosave/reload, preview, publication,
  keyboard category navigation, private revisions, withdrawal and draft-version recovery.
- Full CMS integration and the production TLS/database/media recovery rehearsal passed.
  Backend: 125 passed, 1 existing optional skip, 84.81% coverage. PostgreSQL migration
  release gate, frontend/CMS lint/types/units/builds and production image smoke passed.
- `pnpm test:e2e:release`: three fresh-fixture passes, **40/40 each (120 total)**,
  no retries. Separate test-server/database lifecycles prevent SEO fixtures from
  contaminating later visual baselines. Three stale presentation assertions were corrected.
- Seller controls now stay in normal flow above the footer, including at 320px.
  Canonical LF synchronization restored the original byte receipt; protected logos and
  icon geometry are unchanged. Five intentional navigation/layout baselines were reviewed
  and updated through the gated workflow without weakening comparison thresholds.
- [Release evidence and rollout checklist](../docs/blog-release-checklist.md),
  [editor guide](../docs/blog-editor-guide.md), and
  [Brand Manager verdict: approve_with_notes](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-07-blog-release-handoff.md).
- No known P0/P1 issues remain in the locally verified scope. Hosted CI still needs an
  authorized commit/push; actual production access, rollout and first publication are
  separate approvals. Analytics remains disabled by default pending owner privacy review.

## Dependencies

072–078. [Blog implementation plan](../docs/blog-implementation-plan.md).

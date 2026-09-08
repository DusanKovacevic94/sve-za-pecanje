# 084 — Social preview validation and editor handoff

Status: done
Priority: P2

## Goal

Prove the template-to-download workflow is safe, usable, and documented before
authorizing a separate rollout.

## Work

- [x] Add an isolated editor browser journey: create/recover a draft, edit overrides,
  preview, detect stale state, download, clear overrides, and handle render errors.
- [x] Cover private access, cache policy, API exposure, hostile input, and no public
  upload/analytics/Meta requests. Check draft, published, and unpublished articles.
- [x] Review real JPEG output at full and phone sizes, including long copy and Serbian
  diacritics. Store formal visual review/evidence in the Brand Manager; use approved
  deterministic baselines without weakening existing comparison thresholds.
- [x] Run CMS lint/types/build, focused units and PostgreSQL/browser integration, and
  production-image rendering checks. Run relevant existing blog/marketplace and brand
  gates according to changed surfaces; document commands and results.
- [x] Update the editor guide with copy limits, overrides, unsaved-edit behavior,
  preview/download steps, and draft confidentiality. Warn that a downloaded draft can
  be shared outside the CMS and is not revoked by later unpublishing the article.
- [x] Record release readiness and rollback considerations. Describe Meta account
  connection, platform captions/links, public hosting, queues, duplicate protection,
  retries, and publishing approval as future scope, not implemented functionality.

## Acceptance criteria

- Editors can follow the guide without code changes, production credentials, or social
  account access; no actual publication is part of verification.
- Relevant automated checks and brand validation pass with no open P0/P1 issues.
- Existing article publication, private previews, and marketplace behavior remain intact.
- Evidence distinguishes local readiness from production rollout. Committing, pushing,
  deploying, and posting require separate explicit authorization.

## Primary files

`cms/tests/`, `.github/workflows/ci.yml` as needed, `docs/blog-editor-guide.md`,
`docs/blog-release-checklist.md` or a linked scoped release report, `tasks/README.md`;
Brand Manager `work/reviews/`.

## Dependencies

080–083.

## Completion — 2026-09-08

- Extended 083's browser journey with clearing/fallbacks, known-version recovery and a
  guarded no-external/upload/analytics check. Added live render checks for draft,
  published and withdrawn fixtures, deleted-editor sessions, unchanged documents and
  versions, and unchanged inventories in all three disposable storage buckets.
- Actual Linux/amd64 production runner matches the three approved 081 JPEG hashes
  and line breaks exactly, with no baseline refresh or tolerance changes. New baseline
  fixture provenance is documented in `cms/SOCIAL_CARD_RENDERER.md`.
- CMS lint/types/build, 24 units, full PostgreSQL/MinIO/Mailpit/browser/blog integration,
  production-image rendering, 4 public blog units and managed brand checks passed.
  Brand Manager validation and 6 unit tests passed. No application runtime, public
  frontend, database schema, logo or other managed-asset changes were needed.
- [Scoped release record and rollback handoff](../docs/social-preview-release.md)
  includes exact local results, corrected test assumptions and the operator checklist.
  Editor guide now warns about coalesced autosaves and non-revocable downloads.
- Formal visual verdict: `approve_with_notes`, with fresh synthetic JPEG/phone/editor
  evidence in Brand Manager `work/reviews/2026-09-08-social-preview-release.md`.

080–084 are locally complete. Hosted CI must pass on the selected revisions before an
explicitly authorized rollout. Deployment, analytics enablement, real publication and
automated Meta posting are not included or authorized by completion of this task.

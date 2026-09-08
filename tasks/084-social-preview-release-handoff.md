# 084 — Social preview validation and editor handoff

Status: todo
Priority: P2

## Goal

Prove the template-to-download workflow is safe, usable, and documented before
authorizing a separate rollout.

## Work

- [ ] Add an isolated editor browser journey: create/recover a draft, edit overrides,
  preview, detect stale state, download, clear overrides, and handle render errors.
- [ ] Cover private access, cache policy, API exposure, hostile input, and no public
  upload/analytics/Meta requests. Check draft, published, and unpublished articles.
- [ ] Review real JPEG output at full and phone sizes, including long copy and Serbian
  diacritics. Store formal visual review/evidence in the Brand Manager; use approved
  deterministic baselines without weakening existing comparison thresholds.
- [ ] Run CMS lint/types/build, focused units and PostgreSQL/browser integration, and
  production-image rendering checks. Run relevant existing blog/marketplace and brand
  gates according to changed surfaces; document commands and results.
- [ ] Update the editor guide with copy limits, overrides, unsaved-edit behavior,
  preview/download steps, and draft confidentiality. Warn that a downloaded draft can
  be shared outside the CMS and is not revoked by later unpublishing the article.
- [ ] Record release readiness and rollback considerations. Describe Meta account
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

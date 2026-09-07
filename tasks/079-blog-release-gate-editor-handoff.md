# 079 — Blog release gate and editor handoff

Status: todo
Priority: P1

## Goal

Prove the complete editorial journey and document everyday operation before rollout.

## Work

- [ ] Add CMS lint/types/build, PostgreSQL migration/access checks, and focused CMS tests
  to CI. Keep the existing marketplace and brand release gates required.
- [ ] Extend isolated browser fixtures with CMS PostgreSQL and MinIO; scope setup/cleanup
  to explicit test resources, separate from developer data and other migration gates.
- [ ] Exercise administrator bootstrap, editor login, image upload, draft/autosave/recovery,
  preview, publish, related inventory navigation, draft revision, and unpublish.
- [ ] Run cache-sensitive publishing tests against production builds, including outage,
  missed-hook recovery, stale cache removal, and draft exposure regression cases.
- [ ] Cover blog canonical URLs, sitemap, structured data, responsive layout, keyboard
  use, and image behavior. Add reviewed deterministic visual baselines where useful.
- [ ] Write an editor guide for images/credits/alt text, public draft-image visibility,
  author details, SEO fields, immutable slugs, revisions, publishing, and withdrawal.
- [ ] Record final brand review in the Brand Manager and link its verdict in release
  evidence. Document a first real article checklist without publishing test content.
- [ ] Update README/architecture/deployment docs and the task index after checks pass.

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

## Dependencies

072–078. [Blog implementation plan](../docs/blog-implementation-plan.md).

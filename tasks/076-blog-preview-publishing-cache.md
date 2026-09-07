# 076 — Secure draft preview and publishing cache updates

Status: done
Priority: P1

## Implementation and verification — 2026-09-07

- CMS Preview generates a 60-second article/editor-scoped signed **fragment**, exchanged
  by same-origin POST for an isolated 10-minute HttpOnly host-only preview cookie.
  Every draft read is server-authorized and rechecks the account's current access.
- Preview has private/no-store/noindex headers, no public canonical/social/schema output,
  and no analytics/Sentry initialization. A visible banner and origin-checked exit action
  are verified in the browser, including strict no-referrer behavior.
- Canonical post and author/media hooks send signed notifications with three bounded
  delivery attempts. A fixed-allowlist Next 15 endpoint safely accepts duplicate events.
  Draft/autosave changes leave live content and sitemap timestamps unchanged.
- Deliberate v1 policy: no persistent article cache. Next-request canonical reads are
  the tested reconciliation/fallback, so missed hooks cannot preserve withdrawn content.
  Normal visibility is within 60 seconds after commit; displayed tabs require reload.
- Complete isolated CMS/production-Next integration passes: invalid/expired/tampered/
  wrong-article handoffs, account deletion, browser isolation, publish/update/unpublish/
  delete, metadata/sitemap, failed deliveries, outages/recovery and preview exit.
- [Operational contract and setup](../docs/blog-publishing.md) documents secrets, timings,
  capability/replay limits, monitoring exclusions and the task 078/079 rollout boundary.
  No production access, deployment or real article publication was performed.

## Goal

Preview unpublished work on the actual site and publish changes without redeployment.

## Work

- [x] Add a CMS preview action using a short-lived, article-scoped signed handoff validated
  by the frontend server. Avoid reusable CMS credentials in URLs or client code.
- [x] Create an isolated frontend preview session; validate destination paths and reject
  external redirects. Fetch drafts only with server-side authorization.
- [x] Mark preview responses private/no-store/noindex, bypass public caches, display a
  preview indicator, and provide an exit action. Redact preview tokens from logs.
- [x] Define cache tags/paths for posts, article lists, metadata, authors, and sitemap data
  using APIs supported by the public frontend's installed Next.js version.
- [x] Add authenticated publish/update/unpublish/delete hooks and a bounded revalidation
  endpoint. Cover author/media changes that alter published pages; drafts do not invalidate
  live content. Repeated events must be safe.
- [x] Define retry/reconciliation and a finite fallback freshness window. Do not assume
  stale-while-revalidate immediately removes unpublished content; ensure unavailable posts
  stop serving publicly within the documented deadline even after a missed webhook.
- [x] Document normal update visibility target (within 60 seconds), failed-event recovery,
  and unpublish behavior. CMS/database failure must not bypass publication checks.

## Acceptance criteria

- Editors can preview a draft from the CMS hostname on the main site; anonymous, expired,
  tampered, and wrong-article handoffs fail without leaking content or open redirects.
- A preview visit cannot contaminate a public cache or another browser session.
- In production-mode Next.js, publish/update/unpublish reach pages, metadata, and sitemap
  within the documented deadline without a build; draft saves preserve the live version.
- Invalid hooks are rejected; duplicate hooks are safe; failed delivery has a tested
  recovery path. Test unpublishing an article already present in every relevant cache.

## Primary files

`cms/src/hooks/`, `frontend/src/app/api/`, `frontend/src/lib/cms.ts`, `frontend/e2e/`.

## Dependencies

073, 075. [Blog plan and version-specific references](../docs/blog-implementation-plan.md).

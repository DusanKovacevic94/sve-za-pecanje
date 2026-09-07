# 076 — Secure draft preview and publishing cache updates

Status: todo
Priority: P1

## Goal

Preview unpublished work on the actual site and publish changes without redeployment.

## Work

- [ ] Add a CMS preview action using a short-lived, article-scoped signed handoff validated
  by the frontend server. Avoid reusable CMS credentials in URLs or client code.
- [ ] Create an isolated frontend preview session; validate destination paths and reject
  external redirects. Fetch drafts only with server-side authorization.
- [ ] Mark preview responses private/no-store/noindex, bypass public caches, display a
  preview indicator, and provide an exit action. Redact preview tokens from logs.
- [ ] Define cache tags/paths for posts, article lists, metadata, authors, and sitemap data
  using APIs supported by the public frontend's installed Next.js version.
- [ ] Add authenticated publish/update/unpublish/delete hooks and a bounded revalidation
  endpoint. Cover author/media changes that alter published pages; drafts do not invalidate
  live content. Repeated events must be safe.
- [ ] Define retry/reconciliation and a finite fallback freshness window. Do not assume
  stale-while-revalidate immediately removes unpublished content; ensure unavailable posts
  stop serving publicly within the documented deadline even after a missed webhook.
- [ ] Document normal update visibility target (within 60 seconds), failed-event recovery,
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

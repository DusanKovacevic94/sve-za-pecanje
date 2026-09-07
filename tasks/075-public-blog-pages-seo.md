# 075 — Public blog pages and SEO

Status: done
Priority: P1

## Implementation and verification — 2026-09-07

- `/blog` and `/blog/[slug]` reuse the existing editorial/primitives system and
  shared navigation. Typed allowlist mapping, safe rich text/images, author/dates,
  canonical/social metadata and escaped BlogPosting/BreadcrumbList are implemented.
- `/blog/sitemap.xml` is advertised alongside the independent marketplace sitemap.
  Pagination is self-canonical, with page 2+ noindex/follow and real HTTP redirects/404s.
- Public reads are uncached, bounded and fail closed. Blog-only Node middleware
  prevents streamed 200 responses for known missing/unpublished articles or outages.
- CMS/frontend lint, types and builds pass. Complete isolated CMS integration,
  production-mode blog/browser checks, and focused frontend tests pass. Loaded-content
  screenshots cover narrow/wide views, 200% text/reflow, long titles and missing images.
- Existing marketplace mobile/text-resilience tests and SEO crawl matrix pass.
  The broader sale-journey test fails on an overlapping footer in My listings, and
  the pre-existing raw-byte icon hash check fails on CRLF/LF differences. These are
  explicitly recorded as separate release blockers in task 079, not hidden as passing.
- [Formal scoped brand review](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-07-blog-pages-preview.md):
  `approve_with_notes`; no approved logo or managed icon was changed.
- See [setup and publication contract](../docs/blog-publishing.md). Nothing deployed.

## Goal

Render published articles at `/blog` and `/blog/[slug]` within the existing site.

## Work

- [x] Add a server-only CMS client with timeouts, bounded pagination, explicit published
  queries, and minimal typed response mapping. Keep CMS secrets out of browser bundles.
- [x] Build a paginated article index and article template using existing editorial
  components, typography, tokens, header, and footer. Add a discoverable navigation link.
- [x] Render the supported rich-text nodes safely; validate link protocols and handle
  unknown nodes, missing images, long headings, captions, and empty content.
- [x] Show author, original publication date, meaningful update date, and relevant links.
- [x] Add per-page title/description, public self-canonical URLs, Open Graph/Twitter data,
  safely serialized BlogPosting and breadcrumb structured data, and sitemap entries.
- [x] Define pagination canonical/indexing behavior. Keep drafts, preview routes, and CMS
  URLs out of public sitemaps; use actual content modification timestamps.
- [x] Distinguish not-found articles from CMS outages. Bound stale-content behavior, avoid
  caching outages as empty success/404, and keep unrelated marketplace pages functional.
- [x] Follow the brand brief and save a formal implementation review in the Brand Manager.

## Acceptance criteria

- Published article content and metadata exist in server-rendered HTML; a true missing
  or unpublished slug returns 404. CMS failure is distinguishable and recoverable.
- Draft fields never leak through page HTML, metadata, structured data, or the sitemap.
- Narrow screens, keyboard focus, zoom, image layout stability, and Serbian diacritics
  are covered. Existing marketplace navigation and SEO checks remain green.
- Frontend builds do not depend on a running CMS or production credentials.
- Brand review resolves P0/P1 findings; approved logo files remain unchanged.

## Primary files

`frontend/src/app/blog/`, `frontend/src/lib/cms.ts`, `frontend/src/components/blog/`,
`frontend/src/components/layout/`, `frontend/src/middleware.ts`, `frontend/src/app/blog/sitemap.xml/route.ts`,
`cms/tests/blog.integration.ts`, `frontend/scripts/test-blog.mjs`.

## Dependencies

073, 074. [Brand brief](../../sve-za-pecanje-brand-manager/work/briefs/2026-09-07-blog-editorial-experience.md).

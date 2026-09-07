# 075 — Public blog pages and SEO

Status: todo
Priority: P1

## Goal

Render published articles at `/blog` and `/blog/[slug]` within the existing site.

## Work

- [ ] Add a server-only CMS client with timeouts, bounded pagination, explicit published
  queries, and minimal typed response mapping. Keep CMS secrets out of browser bundles.
- [ ] Build a paginated article index and article template using existing editorial
  components, typography, tokens, header, and footer. Add a discoverable navigation link.
- [ ] Render the supported rich-text nodes safely; validate link protocols and handle
  unknown nodes, missing images, long headings, captions, and empty content.
- [ ] Show author, original publication date, meaningful update date, and relevant links.
- [ ] Add per-page title/description, public self-canonical URLs, Open Graph/Twitter data,
  safely serialized BlogPosting and breadcrumb structured data, and sitemap entries.
- [ ] Define pagination canonical/indexing behavior. Keep drafts, preview routes, and CMS
  URLs out of public sitemaps; use actual content modification timestamps.
- [ ] Distinguish not-found articles from CMS outages. Bound stale-content behavior, avoid
  caching outages as empty success/404, and keep unrelated marketplace pages functional.
- [ ] Follow the brand brief and save a formal implementation review in the Brand Manager.

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
`frontend/src/components/layout/`, `frontend/src/app/sitemap.xml/route.ts`, `frontend/e2e/`.

## Dependencies

073, 074. [Brand brief](../../sve-za-pecanje-brand-manager/work/briefs/2026-09-07-blog-editorial-experience.md).

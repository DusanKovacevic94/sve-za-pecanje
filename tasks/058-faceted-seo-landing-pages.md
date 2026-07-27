# 058 — Faceted SEO policy and curated landing pages

Status: done
Priority: P2

## Problem

The category filter engine now supports repeated categories, brands, locations, ranges, and
dynamic attributes. These combinations can create a practically unlimited number of URL
variants, wasting crawler capacity and creating duplicate or thin search-result pages.
Indexable category and brand pages need clean URLs and an explicit policy.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md) and
[Google's faceted-navigation guidance](https://developers.google.com/crawling/docs/faceted-navigation).

## Work

- [x] Add clean indexable routes:
  - `/kategorije/{categorySlug}`
  - `/kategorije/{categorySlug}/brend/{brandSlug}`
- [x] Render clean routes through the same listing query and filter engine as `/oglasi` so
  result behavior cannot diverge
- [x] Add curated landing-page metadata with category, optional brand, title, meta
  description, intro copy, indexing toggle, and minimum active-listing threshold
- [x] Default indexing eligibility to at least three active listings for a category page and
  five for a category-brand page; allow an explicit audited administrator override
- [x] Add admin create/edit/preview controls for curated category-brand landing pages
- [x] Mark arbitrary search, sort, pagination, multi-category, location, price, and dynamic
  attribute combinations as `noindex,follow`
- [x] Canonicalize a query page to the matching clean category route or curated
  category-brand route; otherwise canonicalize it to the nearest stable browse route
- [x] Keep parameter URLs functional for users, saved searches, active chips, and shared
  links
- [x] Remove parameter URLs, empty categories, and ineligible thin landings from the sitemap
- [x] Add `nofollow` to combinatorial filter links where appropriate
- [x] Block known facet parameters in `robots.txt` only after automated checks confirm that
  every intended indexable category/brand page has a clean route
- [x] Add breadcrumbs and matching structured data to clean landing pages
- [x] Preserve existing listing-detail canonical URLs and redirect no currently valid
  listing URL
- [x] Document Search Console checks for parameter indexing, duplicate pages, sitemap
  coverage, and crawl anomalies
- [x] Add an automated crawl matrix covering status, canonical, robots meta, robots.txt,
  sitemap inclusion, structured data, empty inventory, and administrator override behavior

## Acceptance criteria

- Clean category and approved category-brand pages are indexable with self-referencing
  canonicals
- Arbitrary faceted combinations remain usable but are not intentionally indexable
- Empty, suspended, or below-threshold landing pages are excluded from the sitemap
- Multi-select filters and saved-search URLs continue to work unchanged for users
- No listing-detail canonical or public listing URL changes
- Automated tests fail if a new filter parameter becomes indexable without an explicit
  policy

## Dependencies

- 052

## Implementation notes

- Database revision: `0020_faceted_seo_landings`
- Public evaluation API: `/api/v1/seo/*`
- Admin editor: `/admin/seo`
- Crawl policy and Search Console runbook:
  [faceted-seo-policy.md](../docs/faceted-seo-policy.md)
- Browser crawl matrix: `frontend/e2e/seo-crawl-matrix.spec.ts`

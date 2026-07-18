# 058 — Faceted SEO policy and curated landing pages

Status: todo
Priority: P2

## Problem

The category filter engine now supports repeated categories, brands, locations, ranges, and
dynamic attributes. These combinations can create a practically unlimited number of URL
variants, wasting crawler capacity and creating duplicate or thin search-result pages.
Indexable category and brand pages need clean URLs and an explicit policy.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md) and
[Google's faceted-navigation guidance](https://developers.google.com/crawling/docs/faceted-navigation).

## Work

- [ ] Add clean indexable routes:
  - `/kategorije/{categorySlug}`
  - `/kategorije/{categorySlug}/brend/{brandSlug}`
- [ ] Render clean routes through the same listing query and filter engine as `/oglasi` so
  result behavior cannot diverge
- [ ] Add curated landing-page metadata with category, optional brand, title, meta
  description, intro copy, indexing toggle, and minimum active-listing threshold
- [ ] Default indexing eligibility to at least three active listings for a category page and
  five for a category-brand page; allow an explicit audited administrator override
- [ ] Add admin create/edit/preview controls for curated category-brand landing pages
- [ ] Mark arbitrary search, sort, pagination, multi-category, location, price, and dynamic
  attribute combinations as `noindex,follow`
- [ ] Canonicalize a query page to the matching clean category route or curated
  category-brand route; otherwise canonicalize it to the nearest stable browse route
- [ ] Keep parameter URLs functional for users, saved searches, active chips, and shared
  links
- [ ] Remove parameter URLs, empty categories, and ineligible thin landings from the sitemap
- [ ] Add `nofollow` to combinatorial filter links where appropriate
- [ ] Block known facet parameters in `robots.txt` only after automated checks confirm that
  every intended indexable category/brand page has a clean route
- [ ] Add breadcrumbs and matching structured data to clean landing pages
- [ ] Preserve existing listing-detail canonical URLs and redirect no currently valid
  listing URL
- [ ] Document Search Console checks for parameter indexing, duplicate pages, sitemap
  coverage, and crawl anomalies
- [ ] Add an automated crawl matrix covering status, canonical, robots meta, robots.txt,
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

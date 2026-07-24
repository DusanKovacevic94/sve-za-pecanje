# 052 — Search suggestions, typo recovery, and better empty results

Status: done
Priority: P1

## Problem

Full-text search and structured filters work only after the user knows what to type and how
to narrow the results. There is no autocomplete, spelling assistance, dynamic popular
queries, or useful recovery when a filter combination produces no listings.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Add a debounced suggestions endpoint using PostgreSQL prefix and trigram matching
- [x] Return a typed, size-limited response for category, brand, common-query, and direct
  listing suggestions with stable display/value fields
- [x] Add an accessible search combobox with keyboard navigation, active-option
  announcements, escape handling, and cancellation of stale requests
- [x] Keep exact search behavior available and never silently replace the submitted query
- [x] Show `Da li ste mislili?` suggestions when a close term exists, especially on zero
  results
- [x] Build 30-day popular-query aggregates from task 047 data
- [x] Require at least five distinct authenticated or anonymous users before exposing a
  query publicly, and add an administrator blacklist for unsafe terms
- [x] Retain curated fallback searches for the soft-launch period when traffic is too low
  for privacy-safe dynamic suggestions
- [x] Replace the homepage's hard-coded popular searches with dynamic-or-curated data
- [x] Improve zero-result pages with one-click removal of restrictive filters, parent or
  neighboring categories, recent relevant listings, spelling suggestions, and a
  save-search action
- [x] Track suggestion impressions/selections and zero-result recovery without storing raw
  PII
- [x] Define and test a response-time budget using production-like data before considering a
  separate search service
- [x] Add API, ranking, privacy threshold, diacritic, stale request, accessibility, failure
  fallback, and E2E tests

## Acceptance criteria

- Search remains fully usable when the suggestions endpoint fails
- Serbian diacritics and common Latin spelling variants produce useful suggestions
- A stale response cannot replace newer input
- Private, offensive, and low-frequency queries are not exposed as popular searches
- Zero-result pages provide at least one useful recovery action without clearing unrelated
  filters automatically
- PostgreSQL meets the documented response-time target on representative data

## Dependencies

- 047
- 042
- 043
- 045
- 046

## Verification

- `uv run ruff check app scripts`
- `uv run pytest -q` — 67 passed
- migration upgrade → downgrade → upgrade on a clean SQLite database
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e` — 6 passed
- `pnpm exec playwright test e2e/search-discovery.spec.ts` — 2 passed after final
  contract verification
- bounded 1,000-listing integration timing test plus
  `scripts/benchmark_search_discovery.py` as the 100,000-listing PostgreSQL staging release
  gate

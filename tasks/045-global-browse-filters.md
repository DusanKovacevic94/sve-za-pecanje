# 045 — Complete global browse filters

Status: done
Prioritet: P2

## Problem

The product specification calls for brand, normalized location, seller type, posting age, and
images-only filters. The API partially supports brand and images, but the browse UI does not
expose them and saved-search behavior is inconsistent.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Add brand selection and optional category-scoped brand results
- [x] Replace free-text city filtering with the normalized city list
- [x] Add private seller versus active shop filtering
- [x] Add posting-age presets for 24 hours, 7 days, and 30 days
- [x] Add an images-only filter
- [x] Apply all global filters through the shared backend filter builder
- [x] Add Serbian active chips and preserve filters through all navigation
- [x] Cover combinations of global and category-specific filters

## Kriterijumi prihvatanja

- Every global filter is available on desktop and mobile
- Global filters combine with category filters using AND semantics
- Matching counts and saved searches respect the same global filters
- Public browsing remains restricted to active listings

## Zavisnosti

- 042
- 043
- 044

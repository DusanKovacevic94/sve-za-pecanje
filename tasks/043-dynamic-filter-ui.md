# 043 — Dynamic category filter UI

Status: done
Prioritet: P1

## Problem

Selecting a category changes the listing results but the sidebar never renders that
category's structured attributes. Query helpers also drop repeated parameters.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Render category filters from metadata on desktop and mobile
- [x] Use multi-choice controls for enums, paired fields for ranges, and tri-state booleans
- [x] Show conditional filters only for applicable subtype selections
- [x] Preserve repeated values and nested range parameters in URL helpers
- [x] Preserve category filters through sorting, pagination, and mobile drawer submissions
- [x] Clear stale conditional filters after category or discriminator changes
- [x] Render removable active chips with Serbian labels and units
- [x] Keep URLs shareable and compatible with saved-search creation
- [x] Add component and Playwright coverage

## Kriterijumi prihvatanja

- Choosing any populated category exposes its useful filters
- Applying or removing one filter preserves unrelated filters
- Sorting and pagination do not discard category attributes
- Mobile and desktop produce the same URL and result set

## Zavisnosti

- 040
- 042

# 044 — Saved-search filter parity

Status: done
Prioritet: P2

## Problem

Saved searches store a generic JSON object, but matching counts and digest notifications ignore
condition, brand, images, and every category-specific attribute. Repeated URL values are also
flattened.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Preserve arrays, nested bounds, booleans, and category attributes when saving a search
- [x] Validate saved filters with the same rules as public browse
- [x] Use the shared filter engine for matching counts and digest listing selection
- [x] Recreate browse URLs without flattening repeated values
- [x] Display human-readable Serbian summaries for saved attribute filters
- [x] Keep existing saved searches compatible
- [x] Add parity tests covering browse results, matching counts, and digest matches

## Kriterijumi prihvatanja

- Saving and reopening a category range or multi-value search reproduces the same URL
- Browse, matching count, and digest processing return the same matching listing set
- Existing global-only saved searches continue to work unchanged

## Zavisnosti

- 042
- 043

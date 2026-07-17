# 042 — Category-aware backend filter engine

Status: done
Prioritet: P1

## Problem

The listing endpoint supports only exact string equality for arbitrary JSON keys. It has no
typed range, repeated enum, multi-enum, interval, or category-aware validation. Saved searches
use a separate, less capable implementation.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Implement repeatable exact, multi, numeric-range, boolean, and interval query parsing
- [x] Use the approved bracket contract, including nested `[min]` and `[max]` bounds
- [x] Require a selected category for attribute filters
- [x] Validate keys, filterability, types, bounds, and options against category metadata
- [x] Apply OR within one field and AND across different fields
- [x] Match multi-enum values using any selected value and interval values by overlap
- [x] Keep legacy `attributes[key]=value` exact URLs working
- [x] Extract one shared filter builder for listing browse and saved-search services
- [x] Add SQLite unit coverage and PostgreSQL JSON integration coverage

## Kriterijumi prihvatanja

- Representative rod, reel, lure, terminal-tackle, boolean, and conditional filters return
  the expected rows and totals
- Missing listing attributes never match an active attribute filter
- Invalid or non-filterable attribute requests return `422`
- Browse and saved-search matching use the same filtering implementation

## Zavisnosti

- 040

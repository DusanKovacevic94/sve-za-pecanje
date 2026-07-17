# 040 — Complete category attribute catalog

Status: done
Prioritet: P1

## Problem

Only six of ten categories have attribute definitions, existing definitions are incomplete,
and enum labels expose raw English values. The seed inserts missing rows but does not update
metadata already present in production.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Define Serbian labels, stable values, types, units, ordering, requirements, validation,
  filter modes, and conditional metadata for all ten top-level categories
- [x] Keep only category/type plus one or two identity-defining fields required; detailed
  specifications remain optional
- [x] Add shared option catalogs for technique, target species, material, sizes, and other
  values reused across categories
- [x] Turn `scripts.seed` attribute handling into an idempotent upsert
- [x] Add an Alembic data migration that installs the same catalog in production
- [x] Normalize safe legacy boolean, numeric, multi-enum, and reel-ratio values
- [x] Show required/filterable/conditional/filter-mode metadata on the admin category overview
- [x] Add catalog snapshot and SQLite/PostgreSQL migration tests

## Kriterijumi prihvatanja

- Every top-level category has an intentional attribute set from the approved catalog
- All visible labels are Serbian Latin while stored values stay stable English identifiers
- Existing listings remain valid when new optional fields are absent
- Seed and migration converge on identical category metadata
- Re-running seed or migration checks creates no duplicate definitions or schema drift

## Zavisnosti

- None

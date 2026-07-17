# 041 — Typed dynamic listing attributes

Status: done
Prioritet: P1

## Problem

The listing form renders most category fields as free text. Numbers, booleans, and
multi-enums can therefore be stored as strings, while backend validation checks only missing
required values.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Render enum, multi-enum, numeric, boolean, date, and conditional controls from metadata
- [x] Apply metadata `min`, `max`, `step`, units, `visible_when`, and `required_when`
- [x] Serialize attribute values as real JSON numbers, booleans, arrays, and strings
- [x] Clear incompatible category attributes when category or discriminator values change
- [x] Add backend validation for allowed keys, field types, enum options, ranges, required
  fields, and conditional requirements
- [x] Return Serbian field-level error details for invalid attributes
- [x] Preserve edit compatibility with sparse and legacy listings
- [x] Add form, service, and API regression tests

## Kriterijumi prihvatanja

- Newly submitted attributes have correct JSON types
- Direct API clients cannot submit unknown keys, invalid enum values, or out-of-range values
- Conditional fields appear and become required only for their configured subtype
- Existing listings without new optional values can still be opened, edited, and saved

## Zavisnosti

- 040

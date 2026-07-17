# Category-specific filters and taxonomy

Last updated: 2026-07-17

## Goal

Build metadata-driven category filters for the existing ten top-level categories, then add
the detailed leaf-category tree as a separate phase. Sellers provide only the core identifying
attributes; detailed specifications remain optional.

## Current gaps

- The browse sidebar ignores every category attribute definition.
- Four categories have no attribute definitions.
- Numeric attributes only support exact string comparison.
- Boolean and multi-value attributes can be stored with incorrect JSON types.
- Saved-search matching ignores category attributes.
- Enum labels expose raw English keys.
- The API accepts arbitrary JSON attribute filter keys without category-aware validation.

## Category catalog

| Category | Core required fields | Additional searchable/filterable fields |
|---|---|---|
| Štapovi | Tip, dužina | Težina bacanja, broj delova, transportna dužina, snaga, akcija, tehnika, ciljana riba, materijal |
| Mašinice | Tip, standardizovana veličina | Prenos, broj ležajeva, maksimalna kočnica, težina, materijal špulne, strana ručice, rezervna špulna |
| Varalice | Tip, težina | Dužina, plovnost, dubina rada, boja, količina u pakovanju, ciljana riba |
| Najlon, struna i završni pribor | Tip proizvoda | Tip strune, prečnik, nosivost, dužina kotura, boja, tip/veličina udice, težina olova, količina, tehnika, ciljana riba |
| Elektronika | Tip uređaja | Veličina ekrana, GPS, sonda, baterija, touchscreen, sonar tehnologija, napon, kapacitet baterije, važeća garancija |
| Čamci i oprema | Tip plovila/opreme | Dužina, širina, materijal, kapacitet osoba, maksimalno opterećenje, motor, tip/snaga/napon motora, registracija |
| Torbe, kutije i pribor | Tip pribora | Vodootpornost, materijal, dimenzije, kapacitet štapova, dužina drške i širina glave meredova |
| Odeća i obuća | Tip | Veličina odeće, broj obuće, pol, vodootpornost, sezona/izolacija, tip kombinezona i stopala |
| Kompleti | Tip kompleta | Broj komada, broj štapova/mašinica, tehnika, ciljana riba |
| Ostalo | Tip proizvoda | Tehnika, ciljana riba, količina; namerno ograničeno da kategorija ostane izlaz za neuobičajenu opremu |

Subtype-specific fields use metadata conditions. For example, hook size appears only for
hooks, battery capacity only for batteries, and shoe size only for footwear.

## Metadata and data rules

Extend the existing `AttributeDefinition.validation` JSON contract with:

- Numeric `min`, `max`, and `step`.
- Filter mode: `exact`, `multi`, `range`, `boolean`, or `interval`.
- Conditional `visible_when` and `required_when`.
- Interval group metadata for paired values such as casting weight and lure working depth.

Stable English values remain in storage and URLs. All visible option labels are Serbian Latin.
Seeding becomes an idempotent upsert, and an Alembic data migration applies the same catalog
to production. Safe legacy values are normalized:

- Boolean strings become booleans.
- Numeric strings become numbers.
- Comma-separated multi-enum values become arrays.
- Reel ratios such as `6.0:1` become numeric `6.0`.

Existing listings remain valid when optional attributes are missing.

## Listing form and validation

- Render enum, multi-enum, numeric, boolean, and conditional controls from category metadata.
- Serialize numbers, booleans, and arrays using their real JSON types.
- Validate known keys, types, options, ranges, required fields, and conditional requirements
  on the backend.
- Return Serbian field-level validation details for invalid attributes.
- Preserve global listing fields when changing category and clear incompatible attributes.

## Filter API contract

Attribute filters require a selected category and use repeatable URL parameters:

```text
category=stapovi
attributes[rod_type]=spinning
attributes[rod_type]=feeder
attributes[length_cm][min]=210
attributes[length_cm][max]=270
attributes[casting_weight_g][min]=5
attributes[casting_weight_g][max]=25
```

Rules:

- Repeated values are OR within one attribute.
- Different attributes and global filters combine with AND.
- Numeric bounds are inclusive.
- Interval filters match overlapping product ranges.
- Multi-enum filters match listings containing any selected value.
- Missing attributes do not match an active attribute filter.
- Unknown, non-filterable, or invalid filters return `422`.
- Existing single-value `attributes[key]=value` URLs remain supported.

One reusable backend filter builder is shared by public browse, matching counts,
saved-search digests, and future analytics.

## Browse experience

- Show category filters immediately after selecting a category.
- Use multi-choice enum controls, paired range fields, and tri-state booleans.
- Hide conditional controls until the applicable subtype is selected.
- Preserve filters through sorting, pagination, the mobile drawer, and saved searches.
- Render Serbian active-filter chips with units.
- Add the missing global filters: brand, normalized city, seller type, posting age, and
  listings with images.
- Public browse remains limited to active listings.
- Facet counts beside options are deferred.

## Phase-two leaf taxonomy

- Add leaf categories for rods, reels, lures, terminal tackle, electronics, boats,
  accessories, and clothing.
- Leaf categories inherit parent attributes and add subtype-specific definitions.
- Parent browsing includes all descendants and existing parent URLs remain valid.
- Migrate listings to an obvious leaf using their type attribute; ambiguous listings remain
  at the parent.
- Hide redundant type controls when a leaf category already expresses the product type.
- `Kompleti` and `Ostalo` remain top-level until inventory justifies further splitting.

## Delivery order

1. [040 — Complete category attribute catalog](../tasks/040-category-attribute-catalog.md)
2. [041 — Typed dynamic listing attributes](../tasks/041-typed-listing-attributes.md)
3. [042 — Category-aware backend filter engine](../tasks/042-category-filter-engine.md)
4. [043 — Dynamic category filter UI](../tasks/043-dynamic-filter-ui.md)
5. [044 — Saved-search filter parity](../tasks/044-saved-search-filter-parity.md)
6. [045 — Complete global browse filters](../tasks/045-global-browse-filters.md)
7. [046 — Leaf-category taxonomy](../tasks/046-leaf-category-taxonomy.md)

## Shared acceptance and testing

- Migration tests cover empty and populated SQLite and PostgreSQL databases.
- Catalog tests cover every category, option label, filter mode, and required field.
- API tests cover exact, repeated, range, interval, boolean, conditional, unknown, and
  missing-value behavior.
- Form tests verify type-safe serialization and conditional requirements.
- Saved-search results, matching counts, and digest matches remain identical.
- Playwright covers category switching, mobile filters, active-chip removal, sorting,
  pagination, and shareable URLs.
- Representative JSON queries are checked with at least 10,000 generated listings before
  specialized indexes are considered.


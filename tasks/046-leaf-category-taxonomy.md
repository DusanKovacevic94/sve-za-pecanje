# 046 — Leaf-category taxonomy

Status: done
Prioritet: P2

## Problem

The category model supports parent/child relationships, and the original specification defines
a detailed tree, but production currently has only ten top-level categories. Type attributes
provide temporary classification but cannot offer dedicated category landing pages.

See [the category filter plan](../docs/category-filter-plan.md).

## Šta uraditi

- [x] Add leaf categories for rods, reels, lures, terminal tackle, electronics, boats,
  accessories, and clothing from the approved taxonomy
- [x] Implement parent attribute inheritance with leaf-specific additions
- [x] Allow listing forms to select leaves while preserving the parent overview
- [x] Make parent browse queries include listings from all descendants
- [x] Keep existing parent slugs and URLs valid
- [x] Migrate listings with an unambiguous type attribute to the matching leaf
- [x] Leave ambiguous listings at their current parent
- [x] Hide redundant type controls when a selected leaf already expresses that type
- [x] Keep `Kompleti` and `Ostalo` top-level
- [x] Add migration, hierarchy, browse, form, sitemap, and URL compatibility tests

## Kriterijumi prihvatanja

- Parent pages include all descendant listings
- Leaf pages show only their own category listings
- Existing listing and parent-category URLs remain reachable
- No listing is lost when taxonomy migration cannot determine a leaf
- Parent and leaf forms expose the correct inherited attribute set

## Zavisnosti

- 040
- 041
- 042
- 043
- 044
- 045

# 064 — Mobile filter drawer and multi-select controls

Status: done
Priority: P1

## Goal

Make the complete category-specific filtering system manageable with one hand
on mobile while retaining multi-category and multi-brand selection.

## Work

- [x] Replace the long inline mobile filter block with an accessible drawer.
- [x] Add sticky result/apply and reset actions with selected-filter counts.
- [x] Group global and category-specific filters into collapsible sections.
- [x] Replace native multi-select boxes with searchable checkbox selection.
- [x] Preserve all existing query parameters, SEO rules, and desktop filters.

## Acceptance criteria

- The drawer works at 320 px without horizontal overflow.
- Users can select multiple categories, brands, and enum attributes.
- Applied values survive closing/reopening and appear as removable chips.
- Keyboard focus is trapped, restored, and dismissible with Escape.
- Existing filter E2E tests and URL semantics continue to pass.

## Primary files

- `frontend/src/components/filters/FilterSidebar.tsx`
- `frontend/src/components/listings/BrowseContent.tsx`
- `frontend/src/components/ui/`

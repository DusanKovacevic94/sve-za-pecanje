# 065 — Guided listing creation and photo workflow

Status: done
Priority: P1

## Goal

Turn the long ad form into a calm, guided mobile workflow without weakening
autosave, category attributes, or draft recovery.

## Work

- [x] Add visible progress and navigable form sections.
- [x] Show section completion and validation summaries.
- [x] Add sticky save/publish controls appropriate to viewport and state.
- [x] Improve category and multi-value attribute selection.
- [x] Support multi-photo selection, camera-friendly input, and clearer ordering.
- [x] Preserve autosave, offline, conflict, moderation, edit, and owner actions.

## Acceptance criteria

- Sellers always know their current section, remaining work, and save state.
- A user can add several photos in one selection on supported devices.
- Validation moves focus to the first invalid section/control.
- Draft recovery and publishing behavior remain covered by E2E tests.

## Primary files

- `frontend/src/components/forms/CreateListingForm.tsx`
- `frontend/src/components/forms/ListingImageManager.tsx`
- `frontend/src/components/forms/ListingQualityChecklist.tsx`

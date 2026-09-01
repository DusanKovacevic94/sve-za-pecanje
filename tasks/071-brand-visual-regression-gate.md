# 071 — Brand visual regression and governance gate

Status: todo
Priority: P2

## Goal

Turn the Brand Manager's rules into repeatable checks that catch visual drift
before release.

## Work

- [ ] Add deterministic screenshots for core anonymous, buyer, seller, and
  mobile surfaces.
- [ ] Add icon catalogue snapshots at 14, 18, 24, and 32 px.
- [ ] Check reduced motion, high zoom, and narrow viewport behavior.
- [ ] Enforce canonical Brand Manager asset synchronization in the release path.
- [ ] Document intentional snapshot updates and required brand review evidence.

## Acceptance criteria

- Core screenshot baselines are deterministic and reviewable in CI artifacts.
- Canonical asset drift fails before release.
- Snapshot updates require an explicit reviewed command, not automatic rewrite.
- The gate does not require production credentials or production access.

## Primary files

- `frontend/e2e/`
- `.github/workflows/`
- `sve-za-pecanje-brand-manager/scripts/`


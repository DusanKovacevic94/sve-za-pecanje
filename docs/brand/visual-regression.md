# Brand visual regression release gate

The brand release gate combines two independent checks:

1. `python3 ops/validate_brand_assets.py` verifies every synchronized website
   asset against the deterministic receipt exported by the canonical Brand
   Manager repository.
2. Playwright compares deterministic screenshots for the anonymous homepage,
   a mobile listing, buyer favorites, seller inventory, and the complete icon
   catalogue at 14, 18, 24, and 32 px.

The browser suite also checks 320 px layout containment, 200% text sizing, and
the reduced-motion behavior. It uses the isolated SQLite E2E database, local
seed accounts, and local placeholder artwork. It does not use production
credentials, production data, or production access.

## Run locally

Prerequisites are Python 3.12 with `uv`, Node 22 with pnpm 9.15.4, and the
Playwright Chromium browser installed:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e:brand
```

From the application repository root, validate canonical copies with:

```sh
make brand-release-check
```

If the Brand Manager and application are sibling repositories, the complete
canonical-source comparison is available with `make brand-assets-check`.

## Intentionally update screenshots

Do not call Playwright's `--update-snapshots` option directly. First complete a
formal Brand Manager review with a verdict of `approve` or
`approve_with_notes`. Then provide that review as explicit evidence:

```sh
cd frontend
BRAND_REVIEW_EVIDENCE=../../sve-za-pecanje-brand-manager/work/reviews/YYYY-MM-DD-review.md \
  pnpm test:e2e:brand:update
pnpm test:e2e:brand
```

Review every changed PNG at its captured viewport before committing it. Commit
the approved review in the Brand Manager repository and the baseline changes in
the application repository. CI never rewrites snapshots; a mismatch fails and
the baseline plus diff artifacts are uploaded for inspection.

## Synchronize canonical assets

Edit visual source files only in `sve-za-pecanje-brand-manager/assets/`, run
`make assets-sync` there (or `make brand-assets-sync` from the app), then review
both the copied asset and `docs/brand/managed-assets.json`. The receipt has no
timestamp, absolute path, or credentials, so identical sources always produce
the same tracked file.

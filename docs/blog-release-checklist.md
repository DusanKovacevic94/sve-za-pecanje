# Blog release gate and handoff (079)

This is local release evidence and a checklist for a later explicitly authorized rollout.
It does not authorize production access, DNS changes, deployment or article publication.
The CMS and marketplace remain independent applications and database migration histories.

## Required automated gates

Run from the application root with Docker Desktop available. Install CMS/frontend
dependencies using their own pinned pnpm versions and install Playwright Chromium first.
Do not run the marketplace browser server and the CMS blog harness simultaneously in one
checkout: both build/use the frontend `.next` directory. Their databases/storage are
isolated; build output is not a cross-process coordination mechanism.

```sh
make brand-release-check
make migration-gate-postgres
cd backend
uv run ruff check
uv run python -m pytest --cov=app --cov-report=term-missing --cov-fail-under=60
cd ../frontend
pnpm lint
pnpm exec tsc --noEmit
node scripts/test-blog.mjs
pnpm build
pnpm test:e2e:release
cd ..
make cms-check
make cms-test-integration
make cms-production-rehearsal
```

CI retains the existing backend, PostgreSQL, marketplace browser and raw-hash brand gates.
The new **CMS editorial and recovery release gate** installs each application's pinned
dependencies, runs the complete isolated CMS/media/editor/blog suite, then rebuilds/smokes
the production CMS and backup images with local TLS and full recovery. Production-image
checks depend on all four quality gates. No CI job updates visual baselines automatically.
The same changes must pass hosted CI after the user authorizes committing/pushing; local
execution is not a claim that a remote workflow has run.

The marketplace release runner executes three complete single-worker passes without
retries, restarting its test servers and dedicated database between passes. Do not use
`--repeat-each=3` for this combined suite: SEO and transaction tests intentionally change
inventory, so sharing their database between repetitions contaminates later baselines.

## Coverage and evidence map

| Gate | What it proves |
| --- | --- |
| `cms/tests/integration.ts`, `editorial.ts` | Explicit one-time bootstrap, editor/admin separation, restricted PostgreSQL migrations, private drafts/relations/versions, autosave/history recovery, publication/withdrawal, local recovery mail and logout. |
| `cms/tests/editor-browser.ts` | Real editor login/upload screens, saved draft reload, actual preview action, publication, keyboard category navigation, private revision, withdrawal and version restoration without republication. Authors/relationships and the initial draft are isolated API fixtures. |
| `cms/tests/media.integration.ts` | Image validation/variants, metadata stripping, prefix/bucket restrictions, immutable uploads, version-safe deletion and restart persistence. |
| `cms/tests/blog.integration.ts` | Production frontend/CMS rendering, canonical/SEO/JSON-LD/sitemap, signed previews/hooks, author/media changes, missed-hook withdrawal/republication, outage/deletion/recovery and no draft leakage. |
| Blog browser checks | 320/1280 px, zoom-equivalent viewport, 200% text, long titles, missing images, keyboard focus, inventory failures, deduplication and analytics exclusions. |
| Backend analytics tests | Authorized report, bounded CTR, retention/deduplication, allowed fields, no private user attribution and unchanged marketplace metrics. |
| `cms/tests/production.integration.ts` | Restricted-role database restore, paired media snapshot/copy/checksums/version recovery, secure host-only sessions, local verified TLS, proxy routing and CMS outage isolation. |
| Marketplace/brand browser suite | Buyer/seller regression, inventory controls, responsive/supporting pages and approved deterministic site-wide screenshots. |

CMS fixtures own generated Docker IDs/networks/volumes, random loopback ports, test roles
and synthetic credentials. They do not accept production database/storage URLs. First-pull
Docker status output is separated from concrete container IDs before cleanup. The existing
marketplace suite uses its dedicated `backend/e2e.db`, upload directory and test accounts;
it refuses an already occupied test server. No developer database volume is removed.

Browser evidence is retained in `frontend/test-results/blog/`, `blog-editor/` and
`marketplace/`. CI uploads these synthetic artifacts. Do not attach operator configuration,
production dumps, passwords or signed preview URLs to release evidence.

## Recorded blockers and their resolution

- Seller inventory: the shared card's `h-full` filled a container that also held controls.
  A separate card wrapper restores normal layout. Explicit narrow-grid sizing, a shrinking
  account sidebar and promotion selector keep the controls inside a 320 px viewport.
  The regression checks containment and hit testing; the registration-to-sale journey
  exercises real reservation and subsequent sale.
- Asset hashes: stale CRLF canonical/application checkouts disagreed with the LF receipt.
  Normalize only the five non-logo TypeScript sources to the repositories' existing LF
  rules, then sync from the canonical repository. Raw-byte validation remains strict;
  canonical validation now rejects CRLF before exporting a checkout-dependent receipt.
  No protected logo or icon geometry changes are permitted by this repair.
- Blog navigation intentionally changes the site-wide header/footer captures. Review each
  actual/diff before using the gated snapshot update command; do not raise tolerances or
  automatically accept output. The final review must be linked below.
- Related-card relative dates must remain Serbian Latin; the formatter explicitly selects
  `sr-Latn-RS` and has a focused regression test.

## Analytics and privacy review

`BLOG_ANALYTICS_ENABLED=false` remains the production default. It is separate from Umami
configuration. `/privatnost#analitika-bloga` describes the optional article views/clicks,
per-document random identifier, no cookie/localStorage identity for blog measurement,
keyed IP hashing, 90-day raw-event retention, restricted report and DNT/GPC handling.
This is technical alignment with the implementation, not a legal-compliance certification.
Obtain the responsible owner's privacy approval before enabling live collection.

- Previews, `probni-` slugs, ordinary webdriver runs and configured excluded post IDs must
  not emit blog events. Only the isolated analytics test deliberately enables collection
  and intercepts events locally; it does not send them to production/provider accounts.
- Set `BLOG_ANALYTICS_EXCLUDED_POST_IDS` to comma-separated CMS IDs for any additional
  staging/smoke content. Record actual IDs in that environment's operator log; never assume
  a test database's numeric IDs identify the same posts in production.
- Current local fixtures are disposable and removed; no production fixture IDs were created.
- Admin report: `GET /api/v1/analytics/blog?days=30`; check that anonymous and non-admin
  marketplace sessions are denied. A CMS editor account grants no marketplace report
  access. Report labels mean views, clicks and click-through rate, **not
  contacts, sales or unique people**. No downstream contact attribution is implemented.
- Keep test/staging collection disabled. Enabling analytics is a separate, explicit choice.
- Before enabling collection, confirm `ANALYTICS_RETENTION_DAYS=90` and that the cleanup
  worker runs successfully; changing retention requires reviewing the public disclosure.

## Handoff before an authorized rollout

- [ ] Record approved application and brand-manager revisions independently; require hosted CI.
- [ ] Review [CMS operations](cms-operations.md): restricted role, migration order, image IDs,
  rollback point, paired DB/media recovery, off-host copies and independent retention.
- [ ] Approve production access and exact DNS/host targets separately.
- [ ] Configure provider credentials/sender, CMS hostname/TLS, off-host snapshot scheduling,
  storage version lifecycle and actionable health/backup/hook alerts; verify live delivery.
- [ ] Assign CMS administrator/editor accounts and give editors the [editor guide](blog-editor-guide.md).
- [ ] Obtain privacy/configuration approval if analytics is to be enabled; otherwise leave it off.
- [ ] Obtain separate approval for the first real article and follow its guide checklist.
- [ ] After rollout, verify signed-out blog/marketplace behavior without publishing test content.

## Verification record — 2026-09-07

| Local command/check | Result |
| --- | --- |
| Backend `uv run ruff check` | PASS. |
| Backend full pytest with coverage | 125 passed, 1 skipped; 84.81% coverage (60% minimum). The existing optional marketplace MinIO test skips without its opt-in environment; CMS MinIO isolation/upload/recovery ran against real disposable storage. |
| `make migration-gate-postgres` | PASS: restricted-role upgrade, drift, downgrade/re-upgrade and denied extension creation. |
| Frontend lint/design-token gate, `tsc --noEmit`, `node scripts/test-blog.mjs` | PASS; 4 focused units and 113 customer-facing components checked. |
| Frontend native production build | PASS inside the full CMS publishing harness. |
| CMS lint, typecheck, units and native standalone build | PASS; 12 units. |
| `make cms-test-integration` / CMS `pnpm test:integration` | PASS: full PostgreSQL/MinIO/mail/API/browser/media/publishing/cache/privacy/SEO/analytics suite; marketplace sentinel and schema unchanged. |
| `make cms-production-rehearsal` | PASS: production config validators, backup tests, CMS/tools/backup images, local TLS, routing, secure sessions, restricted-role restore and media recovery. |
| Production Compose `build backend frontend` and frontend runner smoke | PASS: standalone `server.js` exists and runner user is `nextjs`. |
| `make brand-release-check` | PASS: original raw-byte receipt plus 2 validator tests. |
| Brand Manager `python3 scripts/validate.py` and unit discovery | PASS; 6 tests, no protected logo changes. |
| Gated five-baseline refresh | PASS after the approving review; no threshold changes. |
| Marketplace `pnpm test:e2e:release` | PASS: three independent 40/40 passes (120 total), zero failures/retries; approximately 4.8 minutes per pass. |
| Hosted CI | Not run: committing/pushing is not authorized by this task. |

Brand verdict: [approve_with_notes — final scoped review](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-07-blog-release-handoff.md).
Baseline updates used `BRAND_REVIEW_EVIDENCE` with the existing gated update script.
Initial combined editor navigation checks exposed a focus/timing issue in the new test;
explicit scrolling/focus and waiting for navigation passed both the focused and full
CMS runs. Initial visual failures represented the reviewed navigation/layout changes,
not permission to bypass the visual gate.

The first marketplace pass found three stale pre-blog assertions: a global motif
selector matched three uses, contact verification now uses a combined email/phone
label, and the inverse logo lives in the footer rather than the home hero. Assertions
now target those existing semantics; no identity asset or trust behavior was changed.
That diagnostic run was stopped after the first complete pass (37 passed, 3 failed;
the next repetition was interrupted), then restarted clean with the corrected tests.
All 40 tests passed on that clean first pass. Its second repetition then exposed shared
SEO fixture data in the homepage/mobile-listing baselines, so it was stopped and replaced
with the fresh-server, fresh-database release runner described above. The baseline images
and screenshot tolerances were not changed to accept those contaminated scenarios.

079 is complete with no known P0/P1 issues in the locally verified scope. The final
fresh-fixture release runner exited successfully after all three full passes.
Operational checkboxes above remain intentionally incomplete: hosted CI must still run
after an authorized commit/push, and local verification does not authorize rollout,
enabling analytics or publishing the first article. No production content or fixture IDs
were created. Neither repository was committed or pushed during this task.

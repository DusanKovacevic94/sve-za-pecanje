# 077 — Blog discovery links and marketplace engagement metrics

Status: done
Priority: P2

## Goal

Help readers move from useful articles to relevant inventory and measure that activity.

## Work

- [x] Resolve an article's optional category slug through FastAPI, including validation
  and useful editor feedback. Keep marketplace taxonomy ownership in the backend.
- [x] Add a restrained related-listings section using existing cards and public listing
  filters. Handle sold/removed inventory, empty categories, and API outages gracefully.
- [x] Add contextually relevant category and listing links; avoid duplicate catalog tables
  or direct database joins from Payload into marketplace data.
- [x] Define blog view and outbound marketplace-click events in the analytics contract.
  Extend its explicit event allowlist/schema and reporting deliberately; preserve current
  `search_performed` behavior, deduplication, retention, and privacy rules.
- [x] Report article views, category/listing clicks, and click-through rate by stable post
  ID. Distinguish clicks from seller contacts; exclude previews and test fixtures.
- [x] Document downstream contact attribution as a follow-up unless a separately specified
  attribution window and consent/storage model are implemented and tested in this task.

## Acceptance criteria

- An editor-selected category produces valid marketplace links and eligible listings.
- Empty inventory/API failure leaves the article usable and makes no fabricated claims.
- Controlled article visits and clicks produce expected deduplicated counts; unknown
  events/properties are rejected and existing marketplace analytics remains correct.
- Reporting never describes a listing click as a conversation or confirmed sale.

## Primary files

`frontend/src/components/blog/`, `frontend/src/lib/analytics.ts`,
`backend/app/schemas/analytics.py`, `backend/app/services/analytics_service.py`,
`backend/app/api/v1/analytics.py`, `docs/marketplace-metrics.md`.

## Dependencies

075, 076. [Existing metrics contract](../docs/marketplace-metrics.md).

## Implementation and verification — 2026-09-07

- FastAPI remains taxonomy/inventory owner. CMS publication validates the optional slug
  with actionable errors; draft/autosave remains available when the API is down. Public
  articles and previews resolve the live category and use up to three existing cards.
- Added opt-in public `availability=available` filter (active, unreserved, unexpired),
  preserving ordinary browse behavior and descendant category filtering. Anonymous,
  no-store reads have a shared three-second deadline; empty/partial/total API failures
  keep the article readable and never invent inventory or unverified links.
- Explicit `blog_viewed`, `blog_category_clicked`, `blog_listing_clicked` schemas reject
  unknown fields/names. Per-document/per-destination dedupe survives changed client IDs.
  No new cookies/localStorage, user joins, referrer or title collection. Preview,
  configured fixture IDs, `probni-` fixtures, webdriver, DNT and GPC are excluded.
- Admin-only, private/no-store JSON report: `GET /api/v1/analytics/blog?days=1..90`.
  Stable post IDs, views, category/listing clicks, clicked views and bounded CTR; no
  dashboard UI or long-term blog rollup in v1. Existing raw 90-day retention applies.
  Clicks are explicitly not contacts/sales; downstream attribution remains deferred.
- Collection defaults off. Production privacy/configuration review remains in 079;
  staged/test collection must stay disabled. Configuration and editor behavior are in
  [blog publishing](../docs/blog-publishing.md), event semantics in the metrics contract.
- No additional database migrations, dependencies, logo/icon assets, commits or deployment.

Checks passed:

- Backend Ruff and 19 integration tests across blog/marketplace analytics, category
  filtering and search discovery, including authorization, retention, CTR, invalid events,
  sold/deleted/expired/reserved exclusions and unchanged marketplace rollups.
- CMS lint/types/build and 11 unit tests.
- `CMS_TEST_SCOPE=blog pnpm test:integration`: isolated PostgreSQL/MinIO/mail, production
  CMS and frontend builds, publication validation, inventory states, pointer/keyboard
  event counts/dedupe, fixtures/previews/DNT/GPC, cache/SEO/unpublish regression checks.
- Frontend lint/design-token checks (113 components), types and 3 blog unit checks.
- Mobile 320 px/desktop 1280 px captures, 200% zoom/text, long title and missing-image
  checks. Evidence: `frontend/test-results/blog/`, including `inventory-*-320.png`.
- Development Compose configuration validation and brand-manager validation.

[Brand review](../../sve-za-pecanje-brand-manager/work/reviews/2026-09-07-blog-marketplace-discovery.md):
`approve_with_notes`. The separate known release blockers in 079 are not resolved or
reclassified by this task. Next: 078 configuration/backups, then 079 release gate.

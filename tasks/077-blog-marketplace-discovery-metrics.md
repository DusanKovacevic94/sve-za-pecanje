# 077 — Blog discovery links and marketplace engagement metrics

Status: todo
Priority: P2

## Goal

Help readers move from useful articles to relevant inventory and measure that activity.

## Work

- [ ] Resolve an article's optional category slug through FastAPI, including validation
  and useful editor feedback. Keep marketplace taxonomy ownership in the backend.
- [ ] Add a restrained related-listings section using existing cards and public listing
  filters. Handle sold/removed inventory, empty categories, and API outages gracefully.
- [ ] Add contextually relevant category and listing links; avoid duplicate catalog tables
  or direct database joins from Payload into marketplace data.
- [ ] Define blog view and outbound marketplace-click events in the analytics contract.
  Extend its explicit event allowlist/schema and reporting deliberately; preserve current
  `search_performed` behavior, deduplication, retention, and privacy rules.
- [ ] Report article views, category/listing clicks, and click-through rate by stable post
  ID. Distinguish clicks from seller contacts; exclude previews and test fixtures.
- [ ] Document downstream contact attribution as a follow-up unless a separately specified
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

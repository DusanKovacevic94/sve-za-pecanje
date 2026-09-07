# Marketplace health metrics

Last updated: 2026-09-07

This document defines the task 047 event and reporting contract. Product decisions should
use these definitions consistently rather than recreating similar counts in individual
pages.

## Time and retention

- Application timestamps are stored in UTC.
- A reporting day is midnight-to-midnight in `Europe/Belgrade`, including daylight-saving
  time changes.
- Raw analytics events are retained for 90 days.
- Daily marketplace aggregates are retained for 730 days (approximately 24 months).
- The worker refreshes today and yesterday at most once every 15 minutes.
- A date range can be rebuilt idempotently. Existing rows for a rebuilt day are replaced in
  one database transaction.
- Exact-category activity is also included in every ancestor category's aggregate, matching
  the public behavior where a parent category includes all descendant listings.

## Event contract

| Event | Source | When it is recorded | Category |
|---|---|---|---|
| `listing_published` | Backend listing service | A complete listing is created and submitted | Listing category |
| `listing_approved` | Backend listing/moderation service | A listing becomes active through auto or manual review | Listing category |
| `favorite_added` | Backend listing service | A new favorite relationship is created | Listing category |
| `saved_search_created` | Backend saved-search API | A saved search is persisted | Single selected category when available |
| `conversation_started` | Backend message service | The first conversation for a buyer/listing pair is created | Listing category |
| `listing_marked_sold` | Backend listing service | The owner/admin marks a listing sold | Listing category |
| `report_created` | Backend report flow | A new listing report is created | Listing category |
| `listing_viewed` | Deduplicated view endpoint | A non-bot viewer passes the hourly listing/viewer dedupe | Listing category |
| `search_performed` | Browser marketplace tracker | A rendered browse/search result set is seen | Single selected category, otherwise overall only |

Server events are written in the same transaction as the business action. They do not
depend on Umami or frontend tracking.

The public endpoint accepts `search_performed`, `suggestion_impression`,
`suggestion_selected`, `zero_result_recovery`, and the three blog events below.
Search ingestion requires a unique client event ID,
an anonymous browser ID, result count, filter count, and page. Anonymous browser IDs and IP addresses are
keyed hashes before storage. Queries are normalized to Unicode NFKC, lower-cased, whitespace
collapsed, and omitted when they resemble an email address or phone number. Unknown
properties and unknown event names are rejected by schema validation.

## Blog discovery (task 077)

Blog collection uses the same rate-limited `POST /api/v1/analytics/events` endpoint,
but a separate, strict properties schema and reporting path, independent of Umami.
Existing event JSON/entity columns hold the data; no new database or migration is
needed. Blog events never enter search, conversation, or sales counts.

| Event | Meaning | Allowed properties |
|---|---|---|
| `blog_viewed` | A published article document becomes visible | `post_id`, `view_id` |
| `blog_category_clicked` | The reader activates the resolved category link | `post_id`, `view_id`, `target_id` (category ID) |
| `blog_listing_clicked` | The reader activates a related listing link | `post_id`, `view_id`, `target_id` (listing ID) |

`post_id` is the stable numeric Payload post ID, not a title/slug. `view_id` is a
random UUID kept only in the mounted page's memory. The envelope still requires
`client_event_id` and `anonymous_id`; the sender sets the latter to the view UUID.
Blog ingestion ignores both for identity/deduplication, deriving a unique event key
from event name, post ID, view UUID, and target ID. Retries with different client IDs
cannot count the same destination twice within a view. Image/title links on one card
share a target. Reloading creates a new view; multiple tabs are separate views.
This is **not** a unique-reader measure.

Only the resolved category and up to three current related listings are tracked,
including body links to those same destinations. External links, seller profiles,
favorites, navigation, and arbitrary unvalidated body destinations are not included.
Keyboard activation and middle clicks count; right clicks do not. Browser delivery is
best-effort (`keepalive`), never blocks navigation, and has no offline queue.

`GET /api/v1/analytics/blog?days=30` requires marketplace admin/super-admin access.
`days` accepts 1–90 (default 30), using inclusive Europe/Belgrade calendar dates.
The response's `posts` rows contain `post_id`, `article_views`, `category_clicks`,
`listing_clicks`, `clicked_views`, and `click_through_rate`.

CTR = views with at least one category/listing click / article views × 100, or `null`
without views. Multiple destinations cannot inflate CTR beyond 100%. Clicks whose
view was lost or fell outside the reporting range remain in click counts, but not
the CTR numerator. An empty report returns `posts: []`.

The endpoint reports raw retained events only (90 days), not a 730-day blog aggregate.
The existing worker deletes old blog events with all other raw events; marketplace
730-day rollups and search reporting are unchanged. No new admin dashboard UI is
included in v1; the authenticated JSON endpoint is the report.

### Exclusions and privacy

- Frontend `BLOG_ANALYTICS_ENABLED` must explicitly equal `true`; leave it off in
  development, staging, normal fixtures, and release smoke checks. The isolated
  integration test enables it only with locally intercepted requests.
- CMS previews never mount the collector. `/blog/preview` paths are also defensively
  excluded in the client.
- Fixture slug namespace `probni-` and comma-separated stable IDs in frontend
  `BLOG_ANALYTICS_EXCLUDED_POST_IDS` have collection disabled by the server.
  Add any manually created test article IDs before enabling live collection.
- Do Not Track, Global Privacy Control, and `navigator.webdriver` suppress collection.
  Backend ingestion also excludes recognized crawler user agents.
- No new cookies/localStorage, cross-page identity, referrer, URL, title, search text,
  or contact details are collected. Requests omit credentials and referrers. View UUIDs
  and IP addresses are keyed hashes; blog rows store neither user ID nor user-agent text.
- This is client-reported engagement, not audited traffic: blockers can undercount and
  a malicious caller can fabricate public events/post IDs. No CMS authentication or
  database join implies stronger provenance. Do not use these counts for billing.

**A click is not a seller contact, conversation, or sale.** Downstream attribution is
deferred: it needs a separately approved attribution window, consent/storage model,
cross-page identity rules, and tests. Do not join per-view IDs to conversations.
Enable live collection only after the release/privacy disclosure review in 079.

## Daily supply metrics

| Metric | Formula |
|---|---|
| Active listings | End-of-day snapshot of approved, unexpired, unsold listings that are still active in available status history |
| New approved listings | Listings whose `approved_at` falls within the reporting day |
| Unique active sellers | Distinct sellers represented by the active-listing snapshot |
| Listings with three images | Active listings having at least three stored images |
| Photo quality rate | Listings with three images / active listings × 100 |

Historical active-listing repair is best-effort for listings archived before task 047
because older rows do not have an archive timestamp. Once recorded, the daily snapshot is
the source of truth and normal refreshes remain accurate.

## Daily demand and contact metrics

| Metric | Formula |
|---|---|
| Searches | Deduplicated `search_performed` events |
| Zero-result searches | Search events whose `result_count` is zero |
| Zero-result rate | Zero-result searches / searches × 100 |
| Listing views | Deduplicated `listing_viewed` events; recognized bots are excluded |
| Conversations started | Distinct conversations created during the day |
| Contact conversion rate | Conversations started / listing views × 100 |

A conversation is counted only on creation, not for every subsequent message. A viewer can
produce at most one listing-view event per listing during the configured view-deduplication
window.

## Daily liquidity and trust metrics

| Metric | Formula |
|---|---|
| Sold listings | Listings whose `sold_at` falls within the reporting day |
| Days to sale | `sold_at` minus `approved_at`; `created_at` is the fallback for legacy rows |
| Median days to sale | Median days to sale for listings sold during the day |
| Sold within 30 days | Sold listings whose days to sale is at most 30 |
| Sold-within-30-days rate | Sold within 30 days / sold listings × 100 |
| Reports | New listing reports created during the day |
| Reports per 1,000 views | Reports / listing views × 1,000 |

When a denominator is zero, the corresponding rate is unavailable (`null`), not zero. This
distinguishes missing comparison data from a measured zero.

## Range summaries

- Activity counts such as searches, views, conversations, approvals, sales, and reports are
  summed over the selected 7-, 30-, or 90-day period.
- Inventory counts, unique active sellers, and photo quality use the latest available daily
  snapshot in the period.
- Period median days to sale is calculated from daily medians weighted by the number of
  sales represented by each day.
- Previous-period comparison uses the immediately preceding period of the same length.
- Percentage change is unavailable when there is no previous value or the previous value is
  zero.

## Interfaces

- `POST /api/v1/analytics/events` — rate-limited public search/discovery/blog ingestion.
- `GET /api/v1/analytics/blog?days=1..90` — authorized per-post blog engagement report.
- `GET /api/v1/admin/analytics/marketplace?days=7|30|90&category_id=...` — authorized
  dashboard data.
- `GET /api/v1/admin/analytics/marketplace.csv?days=7|30|90&category_id=...` — authorized
  daily CSV export.

The admin response includes `has_data`, `summary`, `previous_summary`, percentage `changes`,
and daily `series`. `summary` is `null` when the selected range has no rollup rows.

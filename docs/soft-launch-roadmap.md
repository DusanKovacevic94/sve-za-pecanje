# Soft-launch roadmap: trust, liquidity, and growth

Last updated: 2026-07-18

## Goal

The site is in a soft-launch stage. The next work should first establish whether listings
attract buyers and complete sales, then reduce listing and search friction, improve trust,
and finally expand retention and organic acquisition.

The marketplace remains a classifieds product. Buyers and sellers arrange payment and
delivery directly. This roadmap does not add escrow, marketplace checkout, courier booking,
sales commission, web push, Elasticsearch, or a paid SMS provider.

Tasks 038 (card payments) and 039 (free-listing quotas) remain deferred. Listing quotas must
not be enabled until marketplace-health data shows adequate supply and liquidity.

## Delivery order

### Wave 1 — Measurement and release safety

1. [047 — Marketplace health metrics and liquidity dashboard](../tasks/047-marketplace-health-metrics.md)
2. [048 — Critical marketplace journey and release gate](../tasks/048-critical-marketplace-e2e.md)
3. [049 — Adaptive anti-abuse and moderation risk queue](../tasks/049-adaptive-anti-abuse.md)

Task 047 establishes the baseline used to evaluate later work. Task 048 protects the current
marketplace journey before new listing and messaging states are introduced. Task 049 adds
proportionate abuse controls without challenging every legitimate visitor.

Metric formulas and the event contract are documented in
[marketplace-metrics.md](marketplace-metrics.md).

### Wave 2 — Seller and buyer activation

4. [050 — Listing drafts, autosave, and quality checklist](../tasks/050-listing-drafts-autosave.md)
5. [051 — Price flexibility, delivery options, and reservation state](../tasks/051-listing-handoff-options.md)
6. [052 — Search suggestions, typo recovery, and better empty results](../tasks/052-search-discovery.md)

Complete drafts before expanding listing fields so the new listing form has one stable
persistence model. Search discovery continues to use PostgreSQL and the existing
category-aware filter engine.

### Wave 3 — Retention and trust

7. [053 — In-app notification center](../tasks/053-in-app-notifications.md)
8. [054 — Follow sellers and shops](../tasks/054-seller-following.md)
9. [055 — SMS-ready phone verification and visible trust signals](../tasks/055-phone-verification-trust.md)
10. [056 — Blocking, muting, and conversation reporting](../tasks/056-conversation-safety.md)

The notification center precedes seller following because follows create notification
events. Phone verification is provider-ready but disabled by default. Conversation reports
feed the moderation queue introduced by task 049.

### Wave 4 — Account governance and sustainable acquisition

11. [057 — Account sessions, data export, and account closure](../tasks/057-account-security-privacy.md)
12. [058 — Faceted SEO policy and curated landing pages](../tasks/058-faceted-seo-landing-pages.md)

## Shared API and data rules

- New listing fields and statuses are additive. Existing clients and existing listings
  receive safe defaults.
- Use cursor pagination for notifications, feeds, moderation cases, and other unbounded
  collections.
- Every mutation uses the existing authentication and CSRF protections, explicit ownership
  checks, stable error codes, and rate limiting.
- High-value domain events are recorded by backend services. Anonymous analytics accepts
  only a documented event allowlist.
- Deploy additive database migrations and backend support before frontend code starts
  sending new fields.
- Store timestamps in UTC and report marketplace daily metrics in the Europe/Belgrade
  timezone.
- Visible UI copy and validation messages remain Serbian Latin. Stored enum values, API
  fields, identifiers, task descriptions, and implementation documentation remain English.

## Shared rollout and testing

- Implement one task per reviewable commit or short commit series.
- Update the task status and `tasks/README.md` only after its acceptance criteria pass.
- Require migration upgrade tests, backend unit/integration tests, frontend type/lint/build
  checks, and relevant Playwright coverage for every task.
- Keep external services behind provider interfaces and configuration flags.
- Capture at least 14 days of reliable marketplace-health data before setting liquidity
  targets or reconsidering task 039.
- Keep card payments deferred until promotion and shop-subscription demand justifies the
  onboarding and accounting cost.

## Success criteria

- Administrators can measure supply, buyer contact, sales, time to sale, and abuse rates.
- A seller can safely pause and resume listing creation and publish a complete listing.
- A buyer can find relevant listings despite spelling mistakes or overly narrow filters.
- Users receive durable, deduplicated notifications and can follow trusted sellers.
- Trust signals are factual and do not expose internal risk scores or private phone numbers.
- Users can block unwanted contact, inspect sessions, export their data, and close an
  account through documented flows.
- Search engines receive clean category landing pages rather than an unlimited faceted URL
  space.

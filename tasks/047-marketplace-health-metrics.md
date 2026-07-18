# 047 — Marketplace health metrics and liquidity dashboard

Status: done
Priority: P1

## Problem

The current admin dashboard shows basic recent counts, while Umami tracks only a few
frontend events. There is no reliable way to determine whether the marketplace has enough
supply, whether buyers contact sellers, or how quickly listings sell. Product and
monetization decisions would therefore be based on guesses.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Define an allowlisted event taxonomy for searches, zero-result searches, listing
  views, favorites, saved searches, conversations started, listings published and approved,
  and listings marked sold
- [x] Record authenticated business events inside backend services so browser analytics or
  ad blockers cannot remove critical marketplace data
- [x] Add a rate-limited anonymous event endpoint only for events that cannot be derived
  server-side; require a client event ID and deduplicate retries
- [x] Normalize search terms, avoid raw PII in event properties, and hash anonymous
  identifiers using the existing privacy approach
- [x] Add daily marketplace aggregates with optional category breakdown:
  - active and newly approved listings
  - unique active sellers
  - percentage of listings with at least three images
  - searches and zero-result rate
  - listing-detail views
  - conversations started and contact conversion rate
  - sold listings, median days to sale, and percentage sold within 30 days
  - report rate per 1,000 listings or conversations
- [x] Add an idempotent worker task that builds or repairs aggregates for a date range
- [x] Add an admin API and dashboard with 7-, 30-, and 90-day ranges, previous-period
  comparison, category filters, and CSV export
- [x] Retain raw events for 90 days and daily aggregates for 24 months
- [x] Document each metric's formula, source event, exclusions, and timezone
- [x] Add unit, integration, authorization, aggregation, timezone, and duplicate-event tests

## Acceptance criteria

- Critical actions are counted when Umami is unavailable
- Retried or duplicate events do not inflate metrics
- The dashboard distinguishes unavailable data from a genuine zero
- Metrics are stored from UTC timestamps and grouped by Europe/Belgrade calendar day
- An administrator can compare supply, demand, contact, and sale metrics by date range and
  category
- A 14-day baseline can be collected before targets or listing quotas are discussed

## Dependencies

- None

# 054 — Follow sellers and shops

Status: done
Priority: P2

## Problem

Buyers can favorite individual listings but cannot keep up with sellers or fishing shops
they trust. This limits repeat visits and forces users to manually repeat broad searches.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Add a unique follower-to-seller relationship shared by ordinary seller profiles and
  shops
- [x] Prevent self-following, duplicate follows, and relationships involving suspended
  accounts
- [x] Add idempotent follow/unfollow operations, the current user's following list, and a
  cursor-paginated feed of active listings from followed sellers
- [x] Add follow controls to seller profiles, shop pages, and listing seller panels
- [x] Show only aggregate follower counts publicly; do not expose follower identities
- [x] Create follower notifications only after a listing becomes active, never while it is
  a draft or awaiting moderation
- [x] Consolidate multiple active listings from one seller into at most one notification per
  follower per day
- [x] Add an optional daily email for followed-seller activity using existing email
  preferences and batching
- [x] Stop future notifications and remove feed visibility when a user unfollows or when
  either party blocks the other
- [x] Exclude archived, sold, rejected, expired, and suspended listings from the following
  feed
- [x] Add uniqueness, authorization, suspension, notification batching, block interaction,
  pagination, query performance, and E2E tests

## Acceptance criteria

- Follow and unfollow requests are idempotent
- A newly approved listing appears once in follower feeds and notifications
- Unfollowing immediately prevents future follow-based notifications
- Suspended or private sellers disappear safely without exposing moderation details
- Shops and ordinary sellers use the same follow behavior
- Feed queries remain within the documented performance budget on representative data

## Dependencies

- 053

## Implementation notes

- Database revision: `0019_seller_following`
- API: `/api/v1/following`, `/api/v1/following/feed`, and
  `/api/v1/following/sellers/{seller_id}`
- Account UI: `/nalog/pratim`
- Behavior and the seven-query feed budget are documented in
  [seller-following.md](../docs/seller-following.md).

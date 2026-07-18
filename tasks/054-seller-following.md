# 054 — Follow sellers and shops

Status: todo
Priority: P2

## Problem

Buyers can favorite individual listings but cannot keep up with sellers or fishing shops
they trust. This limits repeat visits and forces users to manually repeat broad searches.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Add a unique follower-to-seller relationship shared by ordinary seller profiles and
  shops
- [ ] Prevent self-following, duplicate follows, and relationships involving suspended
  accounts
- [ ] Add idempotent follow/unfollow operations, the current user's following list, and a
  cursor-paginated feed of active listings from followed sellers
- [ ] Add follow controls to seller profiles, shop pages, and listing seller panels
- [ ] Show only aggregate follower counts publicly; do not expose follower identities
- [ ] Create follower notifications only after a listing becomes active, never while it is
  a draft or awaiting moderation
- [ ] Consolidate multiple active listings from one seller into at most one notification per
  follower per day
- [ ] Add an optional daily email for followed-seller activity using existing email
  preferences and batching
- [ ] Stop future notifications and remove feed visibility when a user unfollows or when
  either party blocks the other
- [ ] Exclude archived, sold, rejected, expired, and suspended listings from the following
  feed
- [ ] Add uniqueness, authorization, suspension, notification batching, block interaction,
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

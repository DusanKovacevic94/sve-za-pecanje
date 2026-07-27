# Seller following

Seller profiles and active shops share the same `seller_follows` relationship.
The relationship is private: public endpoints expose only `follower_count` and
the signed-in viewer's own `is_following` state.

## Visibility and delivery

- Only active sellers and active or reserved, unexpired listings appear in the
  following feed.
- Draft, pending, rejected, sold, archived, expired, and deleted listings never
  appear.
- Follower notifications are created only when a listing first becomes active,
  through automatic publication or moderator approval.
- Notifications are grouped by follower, seller, and UTC day. Replaying the same
  listing activation event is idempotent.
- Email activity is sent as at most one daily digest per opted-in follower. The
  preference is available under profile email notification settings.
- Unfollowing stops future delivery immediately. Blocking in either direction
  also removes the relationship, its existing cross-user notifications, and feed
  visibility.

## Feed performance budget

The first following-feed page uses at most **7 SQL statements**, regardless of
whether it contains one listing or the maximum 48. This covers the indexed feed
query and bounded `selectinload` queries for card data. The integration suite
guards that budget with representative multi-seller data.

Relevant indexes:

- `(follower_id, created_at, id)` for the current user's following list.
- `(seller_id, follower_id)` plus the unique `(follower_id, seller_id)` key for
  relationship lookup, notification fan-out, and feed joins.
- Existing listing status, seller, expiry, creation, and bump indexes handle feed
  visibility and cursor ordering.

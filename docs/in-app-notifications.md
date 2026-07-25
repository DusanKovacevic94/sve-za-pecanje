# In-app notification center

Task 053 adds a durable, recipient-owned notification feed at
`/nalog/obavestenja`. In-app delivery is independent of email preferences: critical account
events always enter the feed, while the existing profile settings continue to control only
the corresponding email.

## Data and idempotency

`user_notifications` stores the notification type, recipient, optional actor and entity
references, a small safe display payload, a recipient-scoped deduplication key, read time,
group count, and latest event time.

All creation goes through `NotificationService.create`. Domain services and worker tasks
provide stable event and deduplication keys:

- a retried event with the same event ID is ignored;
- messages in the same conversation update one notification and reopen it as unread;
- saved-search matches update one notification per saved search;
- status transitions use one recipient-owned notification for the relevant entity.

Payloads accept only bounded `title` and `body` strings. Message contents, email addresses,
phone numbers, rejection reasons, and arbitrary domain payloads are not copied into the
feed.

## Supported events

The initial stable types are:

- `new_message`
- `listing_approved`, `listing_rejected`, `listing_expiring`, `listing_expired`,
  `listing_reserved`, and `listing_sold`
- `saved_search_matches`
- `review_received`
- `promotion_status`
- `shop_subscription_status`
- `moderation_status`

Producers run inside the transaction that owns the domain change, or inside an idempotent
worker task. Frontend code never creates notifications.

## API and privacy

Authenticated operations are:

- `GET /api/v1/notifications?cursor=<id>&limit=20`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/read-all`

List pagination uses the recipient-owned timeline cursor. Read operations include the
recipient in every lookup, so another user's notification behaves as not found.

Links are resolved when the response is serialized, not trusted from stored payloads. The
server verifies conversation participation, listing ownership or buyer relationship,
saved-search ownership, and ownership of reviews, promotion requests, and shop requests.
If an entity was removed or is no longer accessible, the API returns a generic message and
no link instead of exposing the old payload.

## Browser refresh behavior

The header bell and notification center fetch immediately, every 60 seconds while visible,
and when the window regains focus. Interval callbacks return before making a request while
the document is hidden. Reading a notification publishes a `BroadcastChannel` message,
with a `storage` event fallback, so other tabs refresh their server-authoritative unread
count.

This task intentionally adds no WebSockets, server-sent events, web push, or service worker.

## Retention and deployment

The worker deletes notifications whose latest event is older than 180 days, at most 500 per
normal cycle and never more than 1,000 per explicit call.

No new environment variables are required. Deploy migration `0015_in_app_notifications`:

```bash
cd backend
uv run alembic upgrade head
```

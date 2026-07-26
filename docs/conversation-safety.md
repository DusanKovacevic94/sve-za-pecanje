# Conversation safety

Task 056 adds server-enforced blocking, private conversation muting, and auditable
conversation reports. It does not add payment mediation: buyers and sellers still arrange
payment and delivery directly.

## Blocking

`user_blocks` stores one directed record from the user who blocks to the blocked user. A
block makes messaging unavailable in both directions. `MessageService` checks the pair
before creating a conversation for any listing and before every reply, so switching to a
different listing cannot bypass it.

Both participants receive the same `conversation_unavailable` API error. Conversation
responses reveal `blocked_by_viewer` only to the user who created their own block; the other
participant sees only that the conversation is unavailable. Existing messages, listings,
reports, reviews, and sale records are not deleted.

Unblocking removes only the current user's directed block. It does not restore notification
state or any future follow relationship. If the other participant also has a block, the
conversation remains unavailable.

The notification service suppresses actor-to-recipient notifications whenever either user
has blocked the other. Seller following is not yet implemented; Task 054 must use the same
block lookup and must delete or disable a follow when a block is created.

## Muting

`conversation_preferences` stores per-user state. Muting suppresses new in-app message
notifications and delayed message email for that user only. Messages and unread counters
continue normally, the conversation remains accessible, and the other participant cannot
see the mute state.

## Reporting and evidence

Participants can report a whole conversation or one message with one structured reason:

- `spam`
- `harassment`
- `scam`
- `off_platform_payment`
- `inappropriate_content`
- `other`

An optional explanation is accepted, except `other` requires one. Each submission creates
one `conversation_reports` record and exactly one `conversation_report` moderation case.
The report stores an immutable JSON snapshot containing the target message, up to 50 recent
messages, listing identity and state, reported-account identity and state, and previous
report counts. Changing or removing live content does not alter the snapshot.

Only conversation participants can report or read the conversation. Administrators inspect
the evidence through the existing Task 049 moderation queue, but the administrator role
does not grant participant access to the conversation API and cannot be used to send a
message as either participant.

## Deployment

No environment variables or external services are required. Deploy backend migration
`0017_conversation_safety` before the frontend that sends preference, block, or report
requests:

```bash
cd backend
uv run alembic upgrade head
```

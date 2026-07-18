# 056 — Blocking, muting, and conversation reporting

Status: todo
Priority: P1

## Problem

Messaging supports conversations and unread counts, but users cannot block unwanted contact,
mute a noisy conversation, or report a specific message. Listing reports alone do not give
moderators enough context for harassment, scams, or off-platform payment pressure.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Add unique directed user blocks and per-user conversation preferences for mute state
- [ ] Enforce a block on every message-creation path so neither participant can continue the
  conversation after either party blocks the other
- [ ] Hide contact actions between blocked users across all listings, not just the listing
  that started the original conversation
- [ ] Stop follow relationships and non-essential notifications between blocked users
- [ ] Preserve existing messages, reviews, reports, and sale history for the participants
  and authorized moderators
- [ ] Return a generic `conversation_unavailable` error rather than revealing who initiated
  a block
- [ ] Allow unblock without automatically recreating follows, notifications, or archived UI
  state
- [ ] Make muting affect only the current user's notifications; keep the conversation
  accessible and do not reveal mute state to the other participant
- [ ] Add message-level and conversation-level reporting with a structured reason and
  optional explanation
- [ ] Store an audit-safe content snapshot with the report so later edits/deletion do not
  remove moderation evidence
- [ ] Send reports and related account/listing history to the task 049 moderation queue
- [ ] Add Serbian safety guidance near first contact and report/block controls without
  claiming that the platform mediates payment
- [ ] Add block/unblock, cross-listing bypass, mute/unmute, notification suppression,
  report, deleted content, suspended account, authorization, and E2E tests

## Acceptance criteria

- A block is enforced server-side and cannot be bypassed through another listing
- The blocked user is not told who blocked them
- Prior conversation and moderation evidence remain available to authorized viewers
- Muting suppresses only the muting user's notifications
- Every report creates one auditable moderation case with enough context to investigate
- Administrator access does not permit an administrator to impersonate either participant

## Dependencies

- 049
- 053

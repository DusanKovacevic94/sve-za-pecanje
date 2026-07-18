# 057 — Account sessions, data export, and account closure

Status: todo
Priority: P1

## Problem

Authentication sessions are stored with device metadata, but users cannot inspect or revoke
them. There is also no self-service data export or documented account-closure lifecycle.
These gaps reduce account security and turn privacy requests into manual database work.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Add a sessions page showing current/other sessions, approximate browser/device,
  creation time, last activity, and expiration
- [ ] Add operations to revoke one session and revoke every session except the current one
- [ ] Label the current session explicitly and make revoked sessions fail authorization
  immediately
- [ ] Send a security email after revoking all other sessions or changing a verified phone
- [ ] Add a rate-limited asynchronous account-export request with status tracking
- [ ] Export profile data, listings and image references, authored messages, favorites,
  saved searches, reviews, promotions/subscriptions, and relevant account metadata
- [ ] Exclude passwords, tokens, secrets, internal risk rules, and other users' private
  profile fields
- [ ] Package exports in encrypted object storage and deliver a one-time link that expires
  after 24 hours
- [ ] Prevent repeated requests during a seven-day cooldown and automatically remove expired
  export archives
- [ ] Require recent authentication before account closure
- [ ] On closure request, immediately revoke sessions, hide active listings/shop, stop
  digests, and begin a 30-day reversible grace period
- [ ] Allow cancellation during the grace period after successful authentication recovery
- [ ] After the grace period, pseudonymize the public profile and keep tombstone identities
  where deleting a record would corrupt another participant's conversation, review, or sale
  history
- [ ] Define a retention matrix for moderation, audit, and financial records and require
  policy/legal review before enabling account closure in production
- [ ] Add audit events for export requests/downloads, session revocation, closure,
  cancellation, and final anonymization
- [ ] Add authorization, immediate revocation, signed-link expiry, worker retry, export
  privacy, grace period, suspension, anonymization, and E2E tests

## Acceptance criteria

- A revoked session cannot make another authenticated request
- Export links work once, expire after 24 hours, and archives are deleted automatically
- An export contains the user's supported data without exposing another user's private
  account data
- Account closure is idempotent and reversible during the 30-day grace period
- Public listings and shops disappear immediately after closure is requested
- Suspended users cannot use export or closure to erase active moderation evidence
- The production feature flag stays disabled until the retention policy is approved

## Dependencies

- 048

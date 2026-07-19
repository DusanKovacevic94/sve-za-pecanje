# 049 — Adaptive anti-abuse and moderation risk queue

Status: done
Priority: P1

## Problem

Rate limits and honeypots reduce simple spam, but the marketplace cannot correlate repeated
abuse, duplicate listings, risky first messages, or moderation history. Administrators also
lack a priority queue for suspicious activity. Protection should be adaptive so normal
users are not challenged on every action.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Add moderation cases containing entity type/id, risk score, stable reason codes,
  status, assignment, internal notes, timestamps, and audit history
- [x] Produce risk signals for registration/login/reset velocity, listing-publish velocity,
  first-message velocity, repeated rejection/report history, and repeated failed challenges
- [x] Add duplicate-listing fingerprints based on normalized title, description, category,
  price, and exact image hashes
- [x] Flag same-user and cross-user duplicates for review without automatically deleting or
  banning solely because of a fingerprint or score
- [x] Add a priority-sorted admin queue with status/reason/entity filters, related history,
  notes, and audited bulk clear/approve/reject actions
- [x] Integrate Cloudflare Turnstile behind `TURNSTILE_ENABLED`, site-key, and secret-key
  configuration
- [x] Require a Turnstile challenge only after suspicious behavior or on explicitly
  abuse-prone anonymous forms
- [x] Return a stable `challenge_required` API error and let the frontend obtain and
  resubmit a token without losing entered data
- [x] Validate every token server-side; handle expiry, reuse, provider timeout, invalid
  response, and disabled configuration
- [x] Use Cloudflare test keys in automated tests and never depend on the live service in CI
- [x] Hash network identifiers, define short retention for raw abuse signals, and exclude
  internal scores from public APIs
- [x] Add risk-rule, duplicate-detection, authorization, audit, challenge, and provider
  failure tests

## Acceptance criteria

- A normal registration, listing, and first-message flow receives no new challenge
- Suspicious activity can trigger a challenge and create a moderation case with clear
  reasons
- Duplicate detection flags representative copies without automatically removing them
- Administrators can resolve cases and every action is audited
- Turnstile-disabled and provider-outage modes fail safely
- Internal scores and network identifiers are never shown to users

## Dependencies

- 047

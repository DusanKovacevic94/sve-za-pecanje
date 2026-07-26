# 055 — SMS-ready phone verification and visible trust signals

Status: done
Priority: P1

## Problem

Profiles can contain a phone number, but ownership is not verified. Buyers also have to
piece together account age, reviews, and verification state from different places. Phone
verification can improve trust later, but a soft-launch marketplace should not take on a
paid SMS dependency before volume or abuse justifies it.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [x] Normalize stored phone numbers to E.164 while retaining a user-entered display format
  where appropriate
- [x] Keep phone ownership verification independent from `phone_visible`; verification must
  never make a private number public
- [x] Add phone-verification challenges with user/phone association, hashed code, expiry,
  attempt count, resend timestamp, consumed timestamp, and optional provider reference
- [x] Add request and confirmation operations with a 10-minute code lifetime, five
  confirmation attempts, 60-second resend cooldown, and per-user/per-number daily limits
- [x] Add a provider interface with disabled and deterministic test implementations
- [x] Guard the complete UI and request operation with `PHONE_VERIFICATION_ENABLED`; paid
  SMS activation and provider selection are not part of this task
- [x] Never log verification codes, provider secrets, or full phone numbers
- [x] Clear `phone_verified_at` whenever the normalized phone number changes
- [x] Add factual trust indicators for verified email, verified phone, member-since date,
  review count/rating, and completed sale count
- [x] Display trust indicators consistently on profiles, listing seller panels, and
  conversation headers
- [x] Do not expose internal abuse scores or describe verification as a guarantee of a safe
  transaction
- [x] Allow task 049 risk rules to request stronger verification in the future without
  making phone verification mandatory during soft launch
- [x] Add normalization, disabled-provider, expiry, reuse, brute-force, rate-limit, phone
  change, privacy, authorization, and UI tests

## Acceptance criteria

- Production works normally with phone verification disabled and no SMS credentials
- Verification controls are hidden when the feature is disabled
- Changing a verified phone immediately removes its verified state
- A private verified number remains private everywhere outside authorized account settings
- Expired, reused, or over-attempted codes cannot verify a number
- Visible trust indicators are derived from factual public/account data only

## Dependencies

- 049

## Verification

- `uv run ruff check app db/migrations/versions/0016_phone_verification_trust.py`
- `uv run pytest -q` — 86 passed
- migration upgrade → downgrade → upgrade on a clean SQLite database
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e` — 8 passed
- phone-verification E2E covers profile save, deterministic confirmation, public privacy,
  factual trust rendering, and verification removal after a phone change
- backend tests cover normalization, disabled feature/provider, expiry, reuse, brute force,
  resend and daily limits, ownership, privacy, and factual trust aggregation

# 055 — SMS-ready phone verification and visible trust signals

Status: todo
Priority: P1

## Problem

Profiles can contain a phone number, but ownership is not verified. Buyers also have to
piece together account age, reviews, and verification state from different places. Phone
verification can improve trust later, but a soft-launch marketplace should not take on a
paid SMS dependency before volume or abuse justifies it.

See [the soft-launch roadmap](../docs/soft-launch-roadmap.md).

## Work

- [ ] Normalize stored phone numbers to E.164 while retaining a user-entered display format
  where appropriate
- [ ] Keep phone ownership verification independent from `phone_visible`; verification must
  never make a private number public
- [ ] Add phone-verification challenges with user/phone association, hashed code, expiry,
  attempt count, resend timestamp, consumed timestamp, and optional provider reference
- [ ] Add request and confirmation operations with a 10-minute code lifetime, five
  confirmation attempts, 60-second resend cooldown, and per-user/per-number daily limits
- [ ] Add a provider interface with disabled and deterministic test implementations
- [ ] Guard the complete UI and request operation with `PHONE_VERIFICATION_ENABLED`; paid
  SMS activation and provider selection are not part of this task
- [ ] Never log verification codes, provider secrets, or full phone numbers
- [ ] Clear `phone_verified_at` whenever the normalized phone number changes
- [ ] Add factual trust indicators for verified email, verified phone, member-since date,
  review count/rating, and completed sale count
- [ ] Display trust indicators consistently on profiles, listing seller panels, and
  conversation headers
- [ ] Do not expose internal abuse scores or describe verification as a guarantee of a safe
  transaction
- [ ] Allow task 049 risk rules to request stronger verification in the future without
  making phone verification mandatory during soft launch
- [ ] Add normalization, disabled-provider, expiry, reuse, brute-force, rate-limit, phone
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

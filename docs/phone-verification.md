# Phone verification and factual trust signals

Task 055 prepares phone ownership verification without adding a paid SMS dependency.
Production remains fully operational with:

```dotenv
PHONE_VERIFICATION_ENABLED=false
```

When disabled, the profile response reports the feature as unavailable, the frontend
renders no verification controls, and both verification operations return `FEATURE_DISABLED`.
No SMS credentials are required.

## Phone storage

Profile updates normalize supported Serbian domestic numbers and explicit international
numbers to E.164:

- `064 123 4567` → `+381641234567`
- `00381 64 123 4567` → `+381641234567`
- `+44 7700 900123` → `+447700900123`

`phone_number` stores only E.164. `phone_number_display` retains the trimmed account-entry
format for authorized profile settings. Changing the normalized number immediately clears
`phone_verified_at`; changing only its display formatting does not.

Verification and `phone_visible` are independent. Verification never changes visibility.
The full or display number is excluded from public profiles, listing responses, trust
summaries, conversations, analytics, notifications, and provider references.

## Challenge lifecycle

`POST /api/v1/users/me/phone-verification/request` operates only on the number already saved
to the authenticated profile. It creates a challenge with a keyed hash of the code, a
10-minute expiry, resend timing, attempt counter, consumption time, and optional provider
reference.

`POST /api/v1/users/me/phone-verification/confirm` accepts the challenge ID and six-digit
code. The controls are:

- 60 seconds between sends for the same user or number;
- at most five sends per user and per number in a rolling 24-hour window;
- at most five failed confirmation attempts;
- expired, consumed, superseded, over-attempted, foreign-user, and phone-changed challenges
  cannot verify a profile.

Codes, provider secrets, and full phone numbers are never logged. A keyed HMAC using
`SECRET_KEY` protects stored codes.

## Provider boundary

The provider protocol accepts an E.164 number, code, and challenge ID. This task includes:

- `DisabledSMSVerificationProvider` for every non-test environment;
- `DeterministicTestSMSProvider` with code `123456` only when `APP_ENV=test`.

Setting `PHONE_VERIFICATION_ENABLED=true` in production does not activate paid delivery:
the disabled provider returns a safe unavailable response. A future provider integration
must implement the existing protocol, secret management, delivery monitoring, and vendor
selection as a separate release.

## Trust indicators

Public trust summaries contain factual data only:

- whether email is verified;
- whether the currently stored phone is verified;
- member-since date;
- published review count and average;
- listings completed as sold.

The same component appears on public seller profiles, listing seller panels, and
conversation headers. It explicitly states that these indicators are informative and not a
guarantee of transaction safety. Internal risk scores and moderation reasons are never
included.

Task 049 can inspect `RiskService.verification_context(user)` in future rules, but no current
registration, listing, messaging, or transaction flow requires phone verification.

## Deployment

Migration `0016_phone_verification_trust` normalizes valid existing values, preserves their
display form, clears invalid stored values from the normalized column, and creates the
challenge table and indexes.

```bash
cd backend
uv run alembic upgrade head
```

Keep `PHONE_VERIFICATION_ENABLED=false` on production until a paid provider has been
implemented and approved.

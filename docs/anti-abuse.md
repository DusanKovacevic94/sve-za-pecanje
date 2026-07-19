# Adaptive anti-abuse and moderation

The marketplace uses additive risk signals to prioritize human review. A score or duplicate
fingerprint never deletes a listing or suspends a user by itself.

## Signals and cases

Short-lived `abuse_signals` correlate:

- registration, login, and password-reset velocity by hashed network identifier;
- listing-publish and first-message velocity by user;
- repeated listing reports and moderation rejections;
- failed and passed security challenges;
- same-user and cross-user listing duplicates.

Network identifiers are HMAC-SHA256 hashes using `SECRET_KEY`; raw addresses are not stored.
Signals expire after `ABUSE_SIGNAL_RETENTION_DAYS` (seven days by default) and the worker
deletes expired rows. Public APIs never return signals, hashes, reason codes, or scores.

An open moderation case contains a priority score, stable reason codes, assignment, internal
notes, status, timestamps, and audit entries. Administrators use `/admin/rizik` to filter,
claim, inspect, clear, approve, or reject cases. Listing actions reuse the existing
moderation service. Non-listing cases can be resolved, but a risk decision alone does not
suspend the account.

## Duplicate listings

Every listing stores a fingerprint built from normalized title and description, category,
two-decimal price, currency, and sorted exact hashes of the processed WebP images. Matching
content or an exact image set creates a review case:

- `duplicate_same_user`
- `duplicate_cross_user`

The listing remains in its normal moderation state until an administrator acts.

## Turnstile rollout

Turnstile is disabled by default:

```dotenv
TURNSTILE_ENABLED=false
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Set the backend and public site keys, deploy, then set `TURNSTILE_ENABLED=true`. Normal
registration, listing creation, login, password reset, and first-message traffic is not
challenged. A challenge is requested only after a velocity or repeated-failure threshold is
crossed. The API returns the stable `challenge_required` code; forms retain their current
values, render the widget, and resubmit its token.

Every required token is validated through Cloudflare Siteverify. Tokens expire after five
minutes and are single-use. Invalid, expired, or reused tokens return
`challenge_required`. Provider timeouts and `internal-error` return
`challenge_unavailable` with HTTP 503 and do not bypass the check. With Turnstile disabled,
traffic continues without contacting Cloudflare while risk cases are still recorded.

Automated tests use Cloudflare's published dummy credentials and mock Siteverify, so CI
never calls the live provider:

```dotenv
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Reference: [Cloudflare Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

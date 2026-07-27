# Account security, exports, and closure

Task 057 adds self-service session control and privacy exports. Account closure is implemented
behind a production-disabled policy gate.

## Sessions

Every login creates an `auth_sessions` row with the user agent, creation time, last activity,
and expiry. `/api/v1/account/sessions` returns only the authenticated user's active sessions
and labels the session represented by the current token. A revoked session fails the next
authorization check immediately.

Users can revoke one owned session or every session except the current one. Revoking all
other sessions queues a security email and writes an audit event. Changing a previously
verified phone number also queues a security email.

## Data exports

`POST /api/v1/account/exports` creates an asynchronous export job. A user can create at most
one request in seven days. The worker packages a ZIP containing:

- account and profile data;
- listings and image references;
- messages authored by the user;
- favorites and saved searches;
- relevant reviews;
- promotion and shop-subscription history;
- approximate session metadata.

Passwords, token hashes, secrets, internal moderation rules, risk data, and other users'
private profile fields are excluded.

The ZIP is encrypted with a key derived from `SECRET_KEY` before storage. S3-compatible
storage additionally requests AES-256 server-side encryption and never sets a public ACL.
Local development stores the encrypted object with owner-only permissions.

The worker emails a random one-time application link. Only its SHA-256 hash is stored. The
link expires after 24 hours; a successful download invalidates the token and removes the
encrypted object. The cleanup worker removes unused expired objects. Failed jobs retry up
to three times.

## Account closure lifecycle

Closure requires a session created within the previous 15 minutes and the confirmation text
`OBRIŠI`. The operation is idempotent. It immediately:

- revokes every session;
- changes the account to `pending_deletion`;
- archives active/reserved listings;
- disables the public shop;
- disables message, search-digest, and listing-expiry preferences;
- starts a reversible 30-day grace period.

The user can authenticate again during the grace period and enter `ZADRŽI`. Cancellation
restores only listing/shop/notification state captured at closure time.

After 30 days the worker replaces email, username, password, public profile, phone, and shop
fields with tombstone values. Conversations, authored messages, reviews, listings, sale
links, moderation evidence, audits, and financial records retain the stable user ID so
other participants' history is not corrupted.

Suspended users cannot authenticate to either export or closure endpoints.

## Retention matrix

| Data | Closure request | Final anonymization | Proposed retention |
| --- | --- | --- | --- |
| Public profile and phone | Hidden | Pseudonymized/removed | Immediate |
| Active listings and shop | Hidden | Retained non-public with tombstone owner | Marketplace dispute period; policy review required |
| Conversations and reviews | Preserved | Preserved with tombstone identity | Marketplace dispute period; policy review required |
| Favorites, saved searches, notifications | Disabled | Deleted | At final anonymization |
| Export archives | Unchanged | Unchanged until used/expired | Maximum 24 hours |
| Moderation cases/reports | Preserved | Preserved | Abuse/legal policy review required |
| Audit logs | Preserved | Preserved | Security/legal policy review required |
| Promotions/subscriptions/payment references | Preserved | Preserved | Accounting/legal policy review required |

This matrix is an implementation proposal, not approved legal policy.

## Production gate

Production defaults must remain:

```dotenv
ACCOUNT_CLOSURE_ENABLED=false
ACCOUNT_CLOSURE_POLICY_APPROVED=false
```

The application refuses to start in production if closure is enabled without
`ACCOUNT_CLOSURE_POLICY_APPROVED=true`. Policy/legal review must approve the retention
matrix before both values are changed. Session control and exports do not depend on the
closure flag.

Migration `0018_account_security_privacy` must be applied before deploying this backend.

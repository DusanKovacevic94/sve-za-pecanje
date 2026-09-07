# Public blog, preview and discovery (075–077)

## Related marketplace equipment (077)

The optional `marketplaceCategorySlug` is the part after `/kategorije/` in a marketplace
category URL. The CMS checks it through FastAPI when publishing and gives actionable
messages for unknown/inactive categories and outages. Drafts/autosaves remain saveable
without a successful marketplace read; publishing can proceed after clearing the field.
Set server-only `CMS_MARKETPLACE_API_URL` to the backend API base (native development:
`http://localhost:8001/api/v1`; Compose: `http://backend:8000/api/v1`). No API credentials,
duplicated category catalog, or marketplace database access are needed.

Public articles and authenticated previews resolve the current category and fetch up to
three listings through existing public APIs. The opt-in public listing filter
`availability=available` means active, unreserved and unexpired (or no expiry), preserving
default marketplace browse behavior. Parent categories include descendants. Listings
use existing cards and factual pricing/seller details; the category link is a quiet
secondary action after the article. No field means no section.

Reads are anonymous, uncached, redirect-rejecting, and share a three-second deadline.
Empty inventory and unavailable APIs show distinct Serbian messages without preventing
reading the article. If category resolution fails, no speculative category link is shown.
If only the listing read fails, the verified category link remains. Sold/removed listings
disappear on the next render; an already-open tab is not a live inventory guarantee.
At click time, the normal listing destination owns current availability/404 behavior.

Blog analytics is off by default. At release, configure frontend runtime
`BLOG_ANALYTICS_ENABLED=true` only after reviewing privacy disclosures and test exclusions.
Keep staging/smoke fixtures disabled; reserve `probni-` slugs for fixtures and put any
other fixture IDs in `BLOG_ANALYTICS_EXCLUDED_POST_IDS`. Preview has no collector, cookies
or cross-page IDs are not added, and DNT/GPC are respected. Admin JSON reporting and
precise count/CTR/retention definitions are in [marketplace metrics](marketplace-metrics.md#blog-discovery-task-077).
Only resolved related destinations are measured; clicks are never seller contacts/sales.
Downstream contact attribution remains a separately scoped follow-up.

## Local setup

The marketplace serves `/blog`, `/blog/[slug]`, and `/blog/sitemap.xml`.
The existing `/sitemap.xml` stays independent; `robots.txt` advertises both.
Editors use the standard Payload **Preview** action after saving a draft.
No new database or migration is needed for these two tasks.

Set two independent, random **32+ character** secrets in the CMS and frontend:
`CMS_PREVIEW_SECRET` and `CMS_REVALIDATE_SECRET`. Do not reuse `CMS_SECRET`,
marketplace JWT keys, storage keys, or either of these two secrets for each other.
There are intentionally no checked-in default secrets. Without preview configuration
the CMS Preview action is hidden; public published reads require no credential.

| Variable | CMS | Frontend |
| --- | --- | --- |
| `CMS_PREVIEW_SECRET` | Sign editor handoffs; validate scoped draft reads | Validate handoffs; sign session/read capabilities |
| `CMS_REVALIDATE_SECRET` | Sign change notifications | Authenticate change notifications |
| `CMS_FRONTEND_URL` | Browser-facing site origin, locally `http://localhost:3000` | Not used |
| `NEXT_PUBLIC_APP_URL` | Not used | Same browser-facing site origin, for canonical URLs and origin checks |
| `CMS_INTERNAL_URL` | Not used | CMS origin, locally `http://127.0.0.1:3002`, Compose `http://cms:3002` |
| `CMS_REVALIDATE_URL` | Exact frontend `/api/blog/revalidate` URL; Compose uses the private service address | Not used |
| `CMS_S3_PUBLIC_URL` | Dedicated media public base | Same base at **build and runtime**, to allow approved images |

The optional `docker-compose.cms.yml` wires the internal URLs and shares just the
two purpose-specific secrets. Compose exposes the browser-facing frontend at
`http://localhost:3001` (container port 3000), using `NEXT_PUBLIC_APP_URL` for the
CMS preview destination. The native-development examples above assume port 3000.
Start the frontend as well as the CMS; keep
`localhost` vs `127.0.0.1` consistent in browser URLs. Native development can use
the example variables with the existing DB/MinIO setup. Restart processes after
changing their environment. A frontend build needs neither a CMS nor signing keys.

Production hostname, TLS, secret delivery, mail, backups and rollout remain task
078, followed by the 079 release gate. This implementation does not deploy, publish
real articles, or authorize production access.

## Publication and cache policy

V1 deliberately has **zero cross-request article caching**. Every page, list,
metadata and blog sitemap request reads the anonymous canonical published API with
`draft=false`, an explicit published filter, `cache: no-store`, no credentials and
a 4-second timeout. React `cache` only deduplicates a single render's metadata/page
read. Dynamic HTML and sitemap responses are not cacheable by a CDN or browser.
Blog links use full document navigation, avoiding Next's client Router Cache and
prefetch snapshots. Do not add CDN overrides, ISR, service-worker caching or
`unstable_cache` around these reads without new withdrawal tests and a hard-expiry
design. The tradeoff is additional CMS read traffic; optimize only when measured.

**Visibility target:** publication/update/unpublication appears on the next request
after the CMS transaction commits, normally well within 60 seconds. There is no
SWR grace period, stale-on-error result, or indefinitely retained published cache.
Even when every webhook is lost, the next request reconciles directly with the
current CMS row. In-flight reads started before the commit can complete with the
previous state (bounded by the read timeout; sitemap traversal has a 12-second total
deadline). Already displayed browser tabs are not remotely erased; reload/navigation
is required. Public image URLs remain addressable after an article is withdrawn.

Signed CMS hooks cover publish, canonical update, unpublish, published deletion,
and author/media changes. Post draft/autosave changes do not invalidate live content.
Notifications invalidate the fixed `blog:posts`, `blog:authors`, `blog:media`,
`blog:sitemap` tag namespace and `/blog` layout + `/blog/sitemap.xml` paths using
Next 15's one-argument `revalidateTag`. The tags reserve a consistent invalidation
contract; no content currently relies on a persistent tag cache. Caller-supplied
paths, tags and redirects are never accepted.

Delivery makes three bounded attempts (1-second timeout each, 100/200 ms backoff),
then logs a fixed warning without content, credentials, or URLs. Hook failure never
rolls back editorial work. Repeated notifications are safe. There is no durable
queue: mandatory uncached reads are the tested reconciliation/fallback path, even
after process restart. On failure, check service health, private routing, and matching
secrets; then save a canonical update or send another correctly signed event. No
event replay is needed to remove a withdrawn post.

CMS/database failures fail closed: article/index errors are recoverable 5xx states,
not empty success or 404; the blog sitemap returns 503/no-store/Retry-After. A truly
missing or unpublished slug is a 404. A blog-only Node middleware performs an
additional uncached publication/availability check before rendering and returns
a branded noindex status surface with the correct HTTP status on failure. This
avoids App Router streaming a 200 shell before a late `notFound()` call. Rendering
still independently checks publication; no client header can skip access checks.
The status HTML is rendered from a fixed loopback-only route using the actual
Next server port (no caller-controlled Host or URL). It has a six-second deadline
and a plain Serbian text fallback if rendering also fails. The Docker frontend
binds `0.0.0.0`, including loopback. Existing marketplace pages and sitemap do not depend on CMS availability, and
their normal metadata streaming behavior is unchanged.

## Preview security

The CMS creates a signed handoff scoped to one post and the current editor, valid
for 60 seconds. It is placed in a **URL fragment**, never a query parameter. The
frontend start page removes the fragment immediately and POSTs it to a same-origin
exchange endpoint, which verifies signature, purpose, expiry and the current CMS
account before setting a 10-minute HttpOnly, SameSite=Strict, host-only cookie.
HTTPS uses Secure. The cookie path is `/blog/preview`; public pages ignore it.

The session can only render `/blog/preview/[id]` for that article. Each preview read
uses a new 30-second, article/editor-scoped server-to-server capability. The CMS
rechecks the current account role/existence/lock state on every read. Capabilities
for handoff/session/read are not interchangeable. The exchange ignores arbitrary
redirect inputs; exit is an origin-checked POST to a fixed destination and deletes
the cookie. Preview does not use or forward marketplace/CMS login cookies.
The shared marketplace server client also strips preview and CMS cookies before
calling the backend, including when localhost development ports share a cookie host.

Preview responses are private/no-store/noindex/nofollow/noarchive and use
no-referrer. They contain no canonical, Open Graph, Twitter, article schema or
analytics script. The visible banner distinguishes saved draft content from public
content. Reload to see subsequent saved edits; live keystroke mirroring is not v1.

Handoffs are short-lived bearer capabilities: do not share them. They are reusable
within their 60-second window (no distributed one-time-token store). Logout of the
CMS does not itself revoke an already exchanged preview session; expiry, account
deletion/lock, or signing-key rotation does. Exit clears this browser's session.
Never log request bodies or Authorization/Cookie headers for preview endpoints;
never enable session replay/analytics on preview routes. Task 078 must preserve
these exclusions in reverse-proxy/observability configuration.

## Rendering and SEO

- Serbian Latin copy, Manrope, existing editorial/primitives, Pine actions, no logo changes.
- Defensive allowlist of post/author/media props and supported Lexical nodes. Text
  is escaped by React; links reject unsafe protocols and protocol-relative URLs.
  Image URLs must belong to the configured CMS bucket prefix. Unknown nodes and
  missing images degrade safely; no arbitrary HTML or embeds are injected.
- Visible original publication date and optional editor-designated substantive
  update date. Technical `updatedAt` is used for sitemap modification, not a visible
  freshness claim. Author identity is a public profile, never a CMS login.
- `/blog` is indexable; page 2+ is self-canonical with `noindex,follow`. `?page=1`
  redirects to `/blog`; extraneous query parameters redirect to the normalized
  page. Invalid/out-of-range pages return 404. Pagination is capped at 1,000 pages.
- Blog sitemap includes only canonical published URLs; no paginated, preview,
  author/tag archive or CMS URLs. Traversal is capped at 100 × 100 articles and
  12 seconds; exceeding the cap fails explicitly rather than silently truncating.
- Per-article metadata, BlogPosting and BreadcrumbList use public URLs. JSON-LD
  serialization escapes HTML delimiters and Unicode line separators.
- The slug `preview` is reserved. Marketplace discovery and conversion analytics
  remain task 077, not invented placeholder inventory.

## Verification

From `cms/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm test:integration`. The isolated integration suite provisions disposable
Postgres/Mailpit/MinIO, builds the frontend in production mode, verifies the full
preview/publication/withdrawal journey, and captures browser evidence under
`frontend/test-results/blog/`. It never uses real CMS data or production services.
`CMS_TEST_SCOPE=blog pnpm test:integration` runs a focused blog pass; the default
also retains all earlier editorial/media checks. The `CMS_TEST_IMAGE` variant keeps
its existing isolated Docker-network API/media tests; cross-application blog tests
use the production-mode standalone CMS so the test relay stays loopback-only.

From `frontend/`: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`,
`node --experimental-strip-types --test scripts/test-blog.mjs`.
The CMS suite also checks signing-contract parity between the independently built
applications. Existing marketplace/brand checks remain release requirements.

Current verification: the full CMS/blog integration suite and focused checks pass;
existing marketplace mobile/text-resilience and SEO crawl tests pass. The broader
critical marketplace journey fails because the footer overlaps the Reserve action
on My listings. Raw-byte brand validation also reports CRLF/LF differences in five
unchanged icon files. Both are recorded in task 079 and must be resolved before
production; these tasks do not claim the whole-site release gate is green.

Implementation references: [Payload preview action](https://payloadcms.com/docs/admin/preview),
[Next 15 cache behavior](https://nextjs.org/docs/15/app/guides/caching),
[Next 15 revalidateTag](https://nextjs.org/docs/15/app/api-reference/functions/revalidateTag),
[Node middleware](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware).

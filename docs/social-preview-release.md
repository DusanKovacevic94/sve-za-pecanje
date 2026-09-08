# Social preview release handoff — 084

Scope: the 080–083 SVG/JPEG renderer, optional copy fields, and authenticated CMS
preview/download panel. This document records local verification and requirements
for a later owner-approved rollout. It does not authorize production access, DNS
changes, deployment, article publication, social posting or enabling analytics.

## Editor handoff

Give editors the [image preparation guide](blog-editor-guide.md#prepare-an-instagramfacebook-image).
They can save a draft, use optional social title/description (100/180 characters),
preview current form text including unsaved edits, correct fit errors, and download
the exact displayed 1080 × 1350 JPEG. Blank overrides use article title/excerpt;
fit is checked separately from article publication. Save/autosave still retains copy.

Every relevant edit invalidates the preview. A new render is required even after
reverting the text. Leaving the editor discards the preview, not saved overrides.
Downloading is a manual file handoff, not publication or scheduling. Keep draft
artwork private. Previously downloaded/shared files are not revoked by article
withdrawal, deletion, changed copy, session expiry, or CMS rollback.

## Release prerequisites — owner/operator actions, not executed here

- [ ] Approve exact application and Brand Manager revisions independently and require
  their applicable hosted CI gates to pass. Local passes do not attest to hosted CI.
- [ ] Authorize production access and deployment separately, identifying the exact
  CMS host, image digest, maintenance window, responsible operator and rollback image.
- [ ] Take and verify the existing paired database/media backup; follow
  [CMS operations](cms-operations.md). Apply migration
  `20260908_105018_social_copy_fields` before the new CMS build if not already applied.
  Task 083/084 add no further schema migration. Do not use development schema push.
- [ ] Verify the built runner includes `dist/social-card` and `assets/social`, uses
  its intended working directory, runs non-root, and has suitable container CPU/memory
  limits. The renderer's JS heap limit is not a native-memory/container limit.
- [ ] Keep `CMS_PUBLIC_URL`/configured CMS origin, TLS, session and proxy settings
  consistent with the existing operations configuration. The render endpoint requires
  the exact configured Origin. Do not add wildcard CORS or relax CSRF to fix a mismatch.
- [ ] Preserve `private, no-store` responses for `/api/social-preview/:id`; bypass
  proxy/CDN caches, disable request-body logging, and do not expose the internal worker
  or generated images through a public object route. Use the existing admin accounts.
- [ ] Confirm a single CMS process or provide shared gateway limits before scaling:
  the in-memory limits are six requests/editor and sixty total/minute/process, with
  two render subprocesses and a ten-second render deadline/process. Restarts reset the
  rate windows. The body limit is 4096 bytes with a three-second read deadline.
- [ ] After an authorized rollout, use an explicitly approved private test draft for
  authenticated preview/download and signed-out denial checks. Do not publish test
  articles or images. Confirm ordinary article and marketplace behavior still works.

No new Meta credentials, services, public upload configuration or analytics switches
are required. Do not enable analytics as part of this release. Downloaded files need
the editor's own local handling policy; CMS access control cannot protect them afterward.

## Rollback

The preferred application rollback is to the known-good pre-preview CMS image while
leaving the nullable 082 columns intact. A rollback to the 082 build retains editable
social copy but removes preview/download. An older pre-082 build ignores the extra
columns. Keep the original article data and migration ledger intact.

Do not automatically run `migrate:down`: Payload rolls back the latest **batch**, which
can contain other migrations, and 082's down migration permanently removes social
overrides from both canonical rows and retained versions. If database rollback is
explicitly required, first inspect the exact batch and backup, stop incompatible
writers, and follow the existing tested recovery process. No schema rollback was
performed against production during this task.

Preview buffers and process limits disappear with the old process. Already downloaded
files survive rollback; external distribution is a separate editorial responsibility.

## Verification and evidence

Run CMS commands from `cms/`. Docker checks own disposable containers, random
credentials and loopback services. Production-image rendering has networking disabled,
a read-only filesystem, a non-root user, 512 MB, two CPUs and 64 PIDs. The browser
harness uses synthetic articles only; local published/withdrawn fixture states do not
publish to the real site or social accounts.

| Gate | Coverage |
| --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | CMS static checks, unit safety and actual standalone build. |
| `pnpm test:integration` | Isolated DB/media/mail/API/editor/public-blog journey; draft, published and withdrawn render access; session revocation; posts/versions and three bucket inventories unchanged by rendering. |
| Editor browser in that integration | Current unsaved copy, stale/revoked blobs, identical downloaded bytes, late-response isolation, errors/retry, clearing to fallbacks, recovery of social overrides, keyboard and phone layout. During social preparation, outside-CMS, analytics and media-write requests are intercepted and cause failure. |
| `pnpm test:social:production` | Actual Linux/amd64 runner renders short/diacritics/long-copy cases offline, twice identically, then rejects an unsupported glyph and recovers. Exact approved JPEG hashes and line breaks must match; no automatic baseline update. |
| `node frontend/scripts/test-blog.mjs` | Public content mapping, analytics exclusion and uncached/private-safe fetch contracts. |
| `make brand-release-check`; Brand Manager validation/unit tests | Raw managed asset/identity checks remain unchanged; no protected logo or screenshot threshold changes. |

The existing CI CMS release job already runs units/build, the production-image renderer,
the full integration suite and the wider production/recovery rehearsal. It uploads
synthetic evidence from `frontend/test-results/blog-editor`, `frontend/test-results/blog`
and `cms/test-results/social-card`. New checks are included without a new deployment job.

No backend, public frontend component, marketplace schema, operations behavior or brand
asset changes are part of 084. Fresh local scope is the CMS and dependent blog tests;
the full backend/marketplace release and production-recovery gates remain required in
hosted CI and the broader [blog release checklist](blog-release-checklist.md). Historical
079 passes are not reported as new runs here.

Formal visual review and synthetic production/browser evidence are kept separately in
the Brand Manager: `work/reviews/2026-09-08-social-preview-release.md`.

### Local verification record — 2026-09-08

| Command/check | Result |
| --- | --- |
| CMS `pnpm lint`, `pnpm typecheck`, `pnpm test` | PASS; 24 unit tests. |
| CMS `pnpm build` | PASS; actual standalone build. |
| CMS `pnpm test:integration` | PASS; complete isolated API/media/mail/browser/public-blog suite, including all new 084 checks. |
| CMS `pnpm test:social:production` | PASS; actual runner, three exact approved baseline matches, repeatability, glyph rejection/recovery, offline/read-only/non-root resource limits. |
| Public blog `node frontend/scripts/test-blog.mjs` | PASS; 4 tests. Existing module-type warning does not affect results. |
| `make brand-release-check` | PASS; raw managed assets and 2 validator tests. |
| Brand Manager `python3 scripts/validate.py` and `python3 -m unittest discover -s tests -p 'test_*.py'` | PASS; 6 tests and protected assets unchanged. |
| Hosted CI / production | Not attested by this local run; require green hosted gates on the pushed revision and separate rollout authorization. No production access or social publication occurred. |

Two expanded-test assumptions were corrected before the clean full pass: the network
guard mistook `collection-posts` preferences for a `collect` analytics endpoint, and
version recovery assumed intermediate autosaves were retained. The guard now has a
URL-classification unit test; the recovery test uses an explicit saved-draft checkpoint
fixture and the real Versions UI. No application behavior, assets, image hashes or
comparison tolerances were changed to resolve these test failures.

Verdict: locally ready for rollout review, with no known P0/P1 issues in the scoped
feature. The unchecked operator prerequisites above intentionally remain open.

## Future scope — not implemented

Automatic Instagram/Facebook posting needs a separately approved design and tasks:
Meta account/app connection and token handling; platform-specific permissions and
format verification; captions, article links and alt text; approved public image
hosting and its retention policy; a queue with explicit approval, idempotency/duplicate
protection, retry/backoff, failure visibility and cancellation; behavior for edits,
withdrawals and already-published social posts. No account connection or external API
call is part of this handoff. Provider requirements must be checked when that work begins.

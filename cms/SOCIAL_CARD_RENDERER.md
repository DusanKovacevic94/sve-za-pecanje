# Social card rendering and CMS preview — tasks 081–083

Server-only rendering, optional CMS social-copy fields and private preview/download are
implemented. See the [release handoff](../docs/social-preview-release.md) for rollout
requirements. Nothing in the renderer saves a draft, uploads an image, publishes an article,
or contacts Meta. Do not expose the internal rendering modules directly as a public route.

## API

```ts
import { renderSocialCard, SocialCardError } from './src/social-card'

const card = await renderSocialCard({
  title: 'Kako izabrati prvu mašinicu?',
  description: 'Veličina, prenos i kočnica: šta je važno pri izboru opreme.',
}, { signal: abortController.signal }) // signal is optional

// card.jpeg: Buffer — identical bytes for preview and download.
// card.svg: string — editable, self-contained source; do not serve as inline HTML.
// card.lines: { title: string[], description: string[] }
// card.width: 1080; card.height: 1350; card.templateVersion: 1
```

Only `title` and `description` are accepted. Pass plain text, not URLs to retrieve,
file paths, arbitrary SVG, font choices, or image options. XML-like strings are literal
escaped text, never executable markup. Additional fields, getters, non-string values,
empty copy, overlong input, invisible formatting/controls, invalid surrogates, and
missing font glyphs are rejected. NFC normalization precedes code-point counting;
whitespace collapses. No raw input or underlying error is logged by the renderer.

Resolve a CMS post's overrides with `resolveSocialCardCopy` from `src/social-card/copy.ts`
before calling this API. Blank overrides fall back independently to title/excerpt.
The resolver does not render or enforce card readiness when the article is saved.

`SocialCardError.code` is one of `invalid_input`, `overflow`, `unsupported_glyph`,
`busy`, `timeout`, `cancelled`, or `unavailable`. `field` optionally identifies title
or description. Messages are safe Serbian Latin guidance, without internal paths.
The endpoint authenticates editors, applies CSRF/request limits and private cache
headers, and never turns social-card errors into article-publication failures.

## Private CMS preview

`POST /api/social-preview/:id` accepts exactly `{ title, description }` for an existing
post. It checks editor/admin authentication and target-post access with
`overrideAccess: false`. It requires the configured CMS `Origin`, same-origin Fetch
Metadata when present, and JSON content type. Signed public article-preview handoffs
are not accepted. Both success and handled errors use `private, no-store`, `noindex`,
`nosniff`, `no-referrer`, and `Vary: Cookie, Origin, Authorization`.

Request bodies are limited to 4096 actual bytes, including streamed/chunked input,
with a three-second body-read deadline. Fixed one-minute budgets admit six requests
per user and sixty total per CMS process; malformed authenticated requests also count.
429 responses include `Retry-After: 60`. Budgets are in memory, reset on restart,
and are **not distributed**: retain the single-instance deployment or add a shared
gateway limiter before horizontal scaling. Renderer concurrency/deadline limits still
apply. Do not configure proxies to log request bodies or cache these responses.

The UI is a [Payload UI field](https://payloadcms.com/docs/fields/ui) using
[current form state](https://payloadcms.com/docs/admin/react-hooks). Editors first save
a draft, then preview current form copy, including unsaved changes. Blank overrides
resolve locally through the shared browser-safe `effective-copy.ts`; submitted text
is revalidated on the server and is not written back to the post.

Every relevant field change remounts the panel, removing stale download links,
aborting outstanding work and revoking the old object URL. Superseded/aborted responses
cannot install an image. Preview and download share one JPEG blob URL, never an SVG
or public media URL. Leaving the panel also aborts work and revokes its URL. A browser
request deadline provides an actionable retry if the network stalls. No draft content
is persisted in browser storage, and no analytics event is emitted.

Downloading deliberately saves the image to the editor's device; it does not publish
or schedule anything. Treat downloaded draft artwork as private editorial material.

## Design fidelity and dependencies

The managed `assets/social/` template, layout, Manrope TTF, and OFL license are copied
from the Brand Manager. Original logo bytes remain embedded unchanged. Assets are
SHA-256 checked before use; missing/changed files fail closed without font fallback.
Approved asset revisions require coordinated hash/layout updates and review.

Sharp 0.35.4 alone was evaluated: rendering an SVG with its embedded Manrope font was
byte-identical to rendering with a deliberately missing font. It cannot be trusted to
honor that embedded font in this setup. We retain Sharp for rasterization/JPEG encoding
and use pinned Fontkit 2.0.4 to measure and outline glyphs from the bundled variable TTF
at the approved weights. No browser, system fonts, or second image engine is required.
See [Fontkit's API](https://github.com/foliojs/fontkit) and
[Sharp's input API](https://sharp.pixelplumbing.com/api-constructor/).

Wrapping uses actual shaped advances. Outlined glyph bounds are also checked against
safe margins and vertical zones. Title is fixed at 76 px / at most four lines and 100
characters; description is fixed at 34 px / at most four lines and 180 characters.
Wide words or too many lines produce `overflow`; nothing silently shrinks or truncates.
The editable SVG retains text/font data; an internal outlined SVG is fed to Sharp so
rendering does not depend on installed font engines. These are not promised to have
identical antialiasing to every SVG viewer.

Output is an opaque 1080 × 1350 JPEG, quality 90, 4:4:4 chroma, under 1 MB. It contains
no EXIF/XMP. Repeated inputs produce identical JPEG bytes in the pinned runtime. Do not
assume stable byte hashes across future Sharp/Fontkit/library versions or architectures;
dependency upgrades require visual review and new reproducibility checks.

## Isolation and packaging

- Maximum two active subprocesses **per CMS process**, with no waiting queue. Saturation
  returns `busy`; multi-instance rate coordination remains an operations concern.
- Each render gets a fresh process with a 128 MB JavaScript heap cap, one Sharp thread,
  disabled Sharp caches, and a ten-second parent-enforced deadline. Timeout/abort kills
  the subprocess; the slot is released only after it closes. Native memory is separate
  from the JS heap cap; container-level memory limits remain necessary.
- Only a small allowlisted environment is passed, not CMS/database/storage secrets.
  The fixed SVG and embedded logo are trusted, hash-verified inputs; caller-supplied
  resource references are never interpreted or fetched.
- Draft text/results exist only in process memory. Exiting drops child font caches and
  buffers; no public object storage, temporary file, or render-result cache is used.
  Callers must release returned buffers; the preview revokes its object URLs.
- Run with the CMS root as working directory. `pnpm dev`, `pnpm test`, and `pnpm build`
  build `dist/social-card/{index,worker}.cjs`. The standalone build copies these files
  and `assets/social/` into the real runner image. Generated `dist/` and test evidence
  are ignored by Git and excluded from Docker context.

## Verification

```sh
pnpm test:social
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:social:production
```

The production check builds the actual Docker `runner` target and runs it non-root,
network-disabled and read-only with 512 MB, two CPUs and 64 PIDs. It needs no database
or production secrets. Three synthetic cases are rendered twice, followed by unsupported
glyph rejection and recovery. It records JPEGs/phone proofs/hashes under ignored
`test-results/social-card/`; its uniquely tagged test image is removed afterward.
CI runs this check and uploads only those synthetic artifacts, never real draft content.
Task 084 fixes this check to Linux/amd64 and compares all three JPEG SHA-256 hashes
and line breaks with `tests/fixtures/social-render-baseline.json`, copied from the
approved task-081 Brand Manager evidence at
`work/deliverables/2026-09-08-social-card-renderer/production.json`. The test writes
candidate evidence before comparison, never updates the baseline, and permits no
pixel/hash tolerance. A dependency, architecture or approved-design change requires
separate visual review before explicitly revising that baseline.

Unit checks cover strict input, NFC/diacritics, glyph availability, escaping, width/line
overflow, exact size limits, asset integrity, deterministic JPEG/metadata, saturation,
timeout, cancellation, worker crash/missing files/invalid replies, and recovery.
`pnpm test:integration` also checks endpoint authorization, real JPEGs and request
limits, plus browser byte-identical downloads, unsaved copy, stale URL cleanup,
out-of-order responses, errors/retry, keyboard access and mobile layout.

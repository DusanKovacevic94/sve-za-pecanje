# Social card renderer — task 081

Server-only rendering is ready; CMS fields, authorization/endpoints, and preview/download
UI remain tasks 082–084. Nothing here saves a draft, uploads an image, publishes an article,
or contacts Meta. Do not expose the internal rendering modules directly as a public route.

## API

```ts
import { renderSocialCard, SocialCardError } from './src/social-card'

const card = await renderSocialCard({
  title: 'Kako izabrati prvu mašinicu?',
  description: 'Veličina, prenos i kočnica: šta je važno pri izboru opreme.',
}, { signal: abortController.signal }) // signal is optional

// card.jpeg: Buffer — use these identical bytes for preview and download in 083.
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

`SocialCardError.code` is one of `invalid_input`, `overflow`, `unsupported_glyph`,
`busy`, `timeout`, `cancelled`, or `unavailable`. `field` optionally identifies title
or description. Messages are safe Serbian Latin guidance, without internal paths.
The future endpoint must authenticate editors, apply CSRF/request limits and private
cache headers, and avoid turning social-card errors into article-publication failures.

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
  returns `busy`; a future multi-instance rate limit belongs to the endpoint/operations.
- Each render gets a fresh process with a 128 MB JavaScript heap cap, one Sharp thread,
  disabled Sharp caches, and a ten-second parent-enforced deadline. Timeout/abort kills
  the subprocess; the slot is released only after it closes. Native memory is separate
  from the JS heap cap; container-level memory limits remain necessary.
- Only a small allowlisted environment is passed, not CMS/database/storage secrets.
  The fixed SVG and embedded logo are trusted, hash-verified inputs; caller-supplied
  resource references are never interpreted or fetched.
- Draft text/results exist only in process memory. Exiting drops child font caches and
  buffers; no public object storage, temporary file, or render-result cache is used.
  Callers must release returned buffers; the future preview must revoke object URLs.
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

Unit checks cover strict input, NFC/diacritics, glyph availability, escaping, width/line
overflow, exact size limits, asset integrity, deterministic JPEG/metadata, saturation,
timeout, cancellation, worker crash/missing files/invalid replies, and recovery.

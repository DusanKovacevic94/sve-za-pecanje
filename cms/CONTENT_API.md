# Editorial content API (task 073)

Public rendering, scoped editor preview and publishing hooks are now implemented
in tasks 075–076. See [the cross-application contract](../docs/blog-publishing.md)
for the signed `/blog-preview/:id` endpoint, private session boundary, cache policy
and required runtime configuration. This does not expose a general CMS API key.

All endpoints below are relative to the CMS `/api`. The marketplace frontend will
fetch these server-side; its own users, cookies, and database are unrelated. GraphQL
is disabled. Payload REST pagination uses `docs`, `totalDocs`, `page`, and `hasNextPage`.
The generated TypeScript contract is `src/payload-types.ts`.

## Access

| Resource/action | Anonymous | Editor | Administrator |
| --- | --- | --- | --- |
| Posts | Current published rows only | Create, read, edit, publish, unpublish, delete | Same |
| Post versions/recovery | Denied | Allowed | Allowed |
| Authors | Explicitly public metadata only | Manage | Manage |
| Media | Public metadata referenced by current published posts | Manage; protected deletion | Same |
| Accounts | Denied | Read own account only | Manage accounts and roles |
| Unlock accounts | Denied | Denied | Allowed |

Account recovery is available without login but requires a single-use email token.
New accounts default to `editor`; only administrators can create them or change roles.
The migration preserves all pre-existing foundation accounts as administrators.
Role authorization uses the current account, not a role cached in a token.

Public author identities are separate records with **no link to private CMS users**.
`isPublic` is an explicit opt-in. Authors become readable immediately; media metadata
also requires a reference from a currently published canonical post. Actual image files
are publicly addressable even in drafts: never upload confidential material.
`internalNotes` is editor-only in all three content collections, including relationship
expansion and field selection. No account credentials belong in public metadata/body.
Post `socialTitle` and `socialDescription` are also editor/admin-only for reading,
creation and updates. They are excluded from public responses, including explicit
field selection; they do not replace public article or SEO fields.

## Collections and public fields

- `posts`: `id`, `title`, `slug`, `excerpt`, `body`, `author`, `coverImage`, `seoTitle`,
  `seoDescription`, `firstPublishedAt`, `substantiveUpdatedAt`, optional
  `marketplaceCategorySlug`, `_status`, and Payload `createdAt`/`updatedAt` timestamps.
- `authors`: `id`, `name`, `bio`, `isPublic`, and system timestamps.
- `media`: `id`, `alt`, `caption`, `credit`, `url`, `width`, `height`, `mimeType`, and
  variant URLs/dimensions/MIME types under `sizes`. Operational fields and notes are
  editor-only. See [task 074's media contract](MEDIA_STORAGE.md) for upload constraints,
  cover/inline variants, direct object URLs, visibility, and deletion protection.

Relationships are IDs at `depth=0` and may expand at greater depth. Missing/private
relationships must be handled as unavailable by the eventual public renderer. Changing
shared metadata takes effect immediately; it is not versioned with a post. Image files
are immutable, and deleting media referenced by any post or retained version is blocked.
Publication validates that the author, cover, and inline images are public and complete.

Example public queries:

```text
GET /posts?sort=-firstPublishedAt&limit=12&depth=1
GET /posts?where[slug][equals]=probni-vodic-za-izbor-opreme&depth=1
GET /posts/123?depth=1
```

Anonymous `draft=true` is forced back to the canonical collection; read access also
requires `_status=published`. This prevents draft revisions and historical published
versions of subsequently unpublished articles from becoming public. An inaccessible
single document returns an error; a list simply omits it. Version endpoints, writes,
and account reads reject anonymous callers regardless of query flags.

## Drafts and publication

Drafts may be incomplete. Autosave runs every 1.5 seconds; retention is explicitly
50 versions per article. Old versions are pruned by Payload, so versions do not replace
backups. Editors can reopen and restore versions from the standard admin interface.

Optional `socialTitle` (100 characters) and `socialDescription` (180 characters) are
saved with drafts, autosaves, and versions. Values are NFC-normalized, trimmed, and
whitespace-collapsed; blank values become `null`. Override type/length checks also run
on draft saves. Clearing one override does not clear the other. Existing records and
versions receive nullable columns; no copy is backfilled.

`resolveSocialCardCopy` in `src/social-card/copy.ts` resolves blank overrides to the
current article title/excerpt independently. It neither persists fallback text nor
truncates it. Fallback copy can exceed renderer limits, and unsupported glyphs/line
overflow can make a card unavailable, **without preventing article publication**.
Actual rendering is separate from field validation. Task 083 adds the editor-only
`POST /api/social-preview/:id` endpoint, not a public/social publishing hook. It takes
only current effective `title`/`description`, checks access to an existing post,
and returns a private, non-cacheable JPEG without saving that text. See
[the render contract and limits](SOCIAL_CARD_RENDERER.md#private-cms-preview).

```text
POST  /posts?draft=true                          create an incomplete draft
PATCH /posts/123?draft=true&autosave=true          save a draft revision
GET   /posts/123?draft=true                       read latest revision (authenticated)
PATCH /posts/123  {"_status":"published"}         publish latest content
PATCH /posts/123  {"_status":"draft"}             unpublish the canonical row
GET   /posts/versions?where[parent][equals]=123    list versions (authenticated)
POST  /posts/versions/456?draft=true               recover into a draft
```

For a draft save, send `_status: "draft"` (or omit status), **not** `published`.
Publishing requires nonblank title, slug, excerpt, body text, SEO title/description,
public author, and public cover/inline media with alt text. Slugs use lowercase ASCII
letters, numbers, and single hyphens, are unique, and freeze after first publication,
including while unpublished and during version recovery.

`firstPublishedAt` is set by the server and preserved across edits, unpublish, and
recovery. `substantiveUpdatedAt` is optional and deliberately set by an editor only for
a meaningful revision; it must be between first publication and now. Do not use
Payload's technical `updatedAt` as an editorial freshness claim.

## Rich text

`body` is Lexical JSON (`root.children`), not HTML. The explicit feature list allows
paragraphs, H2/H3 headings, bold/italic text, numbered/bulleted lists, quotes, external
or site-relative links, and a single `image` block with a media relationship and
optional caption. No raw HTML, executable code, arbitrary embeds, user relationships,
or general-purpose blocks are enabled. A server hook rejects unsupported node types,
unsafe link protocols, inline code formatting, and arbitrary text styles, including
on draft saves. Render text as text; never inject CMS strings using raw HTML APIs.

Image block shape (inside Lexical children):

```json
{"type":"block","version":2,"format":"","fields":{"blockType":"image","image":123,"caption":"Opis fotografije."}}
```

## Authentication and recovery

The `szp-cms-token` cookie is host-only (no parent-domain cookie), HttpOnly, SameSite=Lax,
and Secure in production. Trusted CORS/CSRF origins are exactly `CMS_PUBLIC_URL`.
Sessions expire after two hours; five bad logins lock an account for ten minutes.
Account creation, password changes, and recovery require at least 16 characters.
Only administrators may unlock it. Logout uses `/users/logout` and revokes that session.

`POST /users/forgot-password` accepts an email and returns the same success response
for existing and unknown accounts, without a reset token. The email links to the
configured CMS origin. `POST /users/reset-password` accepts `token` and `password`;
tokens expire after 30 minutes and cannot be reused after a successful reset.

Development/test always uses local Mailpit (`CMS_SMTP_HOST`/`CMS_SMTP_PORT`) and refuses
remote SMTP hosts, even if a Resend key happens to be present. With Compose, inspect
mail at `http://localhost:8025`. Production requires `CMS_RESEND_API_KEY` from the
existing Resend account and a verified bare address in `CMS_EMAIL_FROM`; there is no
log-only fallback. No production email is sent by local tests or credential-free builds.

## Local fixtures and verification

After applying migrations, run `pnpm seed` from `cms/` (or run it inside the CMS
development container). This local-only command creates a deterministic Serbian Latin
sample draft and private author/media metadata. It does not create accounts, overwrite
an existing fixture, or publish an article. Its synthetic image file is publicly
addressable, like other draft images. It refuses production/remote databases.

`pnpm test:integration` uses disposable PostgreSQL, Mailpit, and MinIO containers and a built
standalone server. It exercises the API as anonymous, editor, and administrator,
including publication isolation, version recovery, relationship privacy, migration
rollback/upgrades, legacy account migration, throttling, unlock, recovery, and logout.
`CMS_TEST_IMAGE=szp-cms:local pnpm test:integration` repeats it against the Docker image.

Upstream references checked 2026-09-07: [draft semantics](https://payloadcms.com/docs/versions/drafts),
[collection access](https://payloadcms.com/docs/access-control/collections),
[rich-text features](https://payloadcms.com/docs/rich-text/official-features), and
[email adapters](https://payloadcms.com/docs/email/overview).

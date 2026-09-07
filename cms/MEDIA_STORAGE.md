# CMS image storage (task 074)

The CMS reuses the S3-compatible provider, **not marketplace buckets, object keys,
credentials, or upload records**. Local development uses the existing MinIO service,
a dedicated `svezapecanje-cms` bucket, a `media/` prefix, and the restricted `szp-cms`
storage identity. Database identity and storage identity are independent credentials.

## Visibility and editorial workflow

Every uploaded image file and generated variant is publicly addressable by its URL,
including images attached only to drafts or with `isPublic=false`. Never upload
confidential material. Random filenames discourage enumeration but are not access
control. Unpublishing an article does not revoke image URLs or copies cached elsewhere.

Media **metadata** has stricter access: anonymous reads require `isPublic=true` and a
reference from a currently published canonical post (cover or inline image). A draft,
unpublished post, or retained historical version is not sufficient. Public responses
contain only `id`, `alt`, `caption`, `credit`, `url`, `width`, `height`, `mimeType`, and
variant `url`/dimensions/MIME types. Filenames, prefixes, internal notes, and operational
timestamps are not returned. Editors can access the complete library.

Editors upload a JPEG, PNG, or WebP in Media, fill alt text and optional caption/credit,
and mark the metadata public before publishing an article that uses it. Cover images
use the post's `coverImage` relationship; inline images use the existing `image` block,
which supports its own contextual caption. The image's alt text and credit remain in
Media. Newly published content now requires an actual uploaded file, not metadata alone.

Task 073 metadata-only records survive the migration, but do not gain fabricated files.
Upload real files as new media records and update article references before publication.

## Input and output contract

- Maximum input: 10 MB, 40 megapixels, 10,000 pixels per side; minimum 180 pixels per side.
- Accept only non-animated JPEG, PNG, and WebP. Decode contents and verify the MIME type;
  reject SVG, HTML, malformed/truncated files, animation, and unsupported image formats.
- Auto-orient, remove EXIF/XMP/ICC metadata, and re-encode as WebP at quality 85.
  The stored master fits inside 2400 × 2400 without enlargement. Original untrusted
  bytes and user-provided filenames are never stored.
- Object names are generated UUIDs. Files are immutable: replacement uploads, URL
  imports, and in-place recropping are rejected. To change pixels or crop composition,
  prepare a new image, upload it, and replace the article's relationship. Old versions
  continue to reference the original file.

| Variant | Target | Use |
| --- | --- | --- |
| `thumbnail` | 320 × 180, center crop | Library/cards |
| `coverMobile` | 640 × 360, center crop | Mobile covers |
| `coverDesktop` | 1280 × 720, center crop | Desktop covers |
| `inline` | 768 px wide, original aspect ratio | Inline images |
| master `url` | Up to 2400 × 2400 | Larger inline fallback |

Payload may omit a size when the source is too small for it. Renderers must fall back
to a suitable available variant or the master, using its actual dimensions. For crisp
desktop covers, upload at least 1280 × 720. Center crops are generated automatically;
there is no destructive in-place crop editor. Include meaningful alt text in the public
renderer and prefer the inline block's caption when provided.

## Local setup

Add another independent random secret to the application root `.env`:

```dotenv
CMS_S3_ACCESS_KEY_ID=szp-cms
CMS_S3_SECRET_ACCESS_KEY=
CMS_S3_PUBLIC_URL=http://localhost:9000/svezapecanje-cms
```

Use `openssl rand -hex 32` to generate the secret. Then run `make cms-dev`.
The optional Compose overlay starts MinIO and a one-shot `cms-storage-provision`
service before the CMS. Only that helper receives the local MinIO root credentials;
the web service receives the restricted CMS credentials. The helper can be repeated
against existing local volumes and refuses an existing CMS user with unrelated grants.
It does not change listing/export bucket policies or lifecycle settings.

For direct local commands, configure `cms/.env` from its example and provision with
`pnpm storage:provision` (requires the MinIO `mc` CLI). The Docker `tools` image already
contains the pinned CLI. Provisioning is restricted to local MinIO, the dedicated
bucket, and `szp-cms`; it is not a production provisioning tool.

`pnpm seed` now uploads a synthetic image for its sample draft. The metadata remains
private, but the generated image file follows the public-file policy above.

## Provider configuration and isolation

The web application reads only these storage settings:

```dotenv
CMS_S3_ENDPOINT=https://fsn1.your-objectstorage.com
CMS_S3_REGION=eu-central
CMS_S3_BUCKET=your-dedicated-cms-bucket
CMS_S3_FORCE_PATH_STYLE=false
CMS_S3_PUBLIC_URL=https://your-dedicated-cms-bucket.fsn1.your-objectstorage.com
CMS_S3_ACCESS_KEY_ID=
CMS_S3_SECRET_ACCESS_KEY=
```

These are illustrative Hetzner settings matching the provider supported by the
marketplace configuration. Confirm the bucket's real location/region during rollout.
MinIO uses endpoint `http://minio:9000`, region `us-east-1`, and path style. Production
requires HTTPS endpoints/public URLs and separate credentials. The public URL includes
the bucket path for path-style hosting, but excludes `/media`; the CMS appends that.

Hetzner keys are project-wide by default: a new key in the marketplace project is
**not isolated by creating another bucket**. Prefer a separate CMS-only project and
bucket, or a cross-project runtime key with an explicit policy granting access only to
the CMS bucket. Confirm denied listing/export writes and deletes before rollout. Do not
change marketplace-wide policies or create projects as part of this local task.
[Hetzner credential restrictions](https://docs.hetzner.com/storage/object-storage/faq/s3-credentials/).

The included local policy permits object read/write/delete only within `media/`, plus
scoped bucket listing/location and multipart cleanup permissions. It grants no bucket
creation/deletion or listing/export access. Production policies must achieve the same
boundary; MinIO IAM policy syntax cannot simply be pasted as a Hetzner identity policy.
Never supply root/marketplace credentials to the CMS web service.

Files use **direct object URLs**, not authenticated CMS downloads. Configure anonymous
`GetObject` on `media/*` only; do not grant anonymous listing, writes, deletes, or access
to other prefixes. No object ACL is sent. This supports providers with ACLs disabled;
readability must come from the bucket policy. There are no browser-to-S3 uploads or
presigned upload endpoints: every upload passes through authenticated CMS validation.
AWS optional checksum trailers are disabled unless required for the request because
S3-compatible providers differ in checksum support.

Expose `CMS_S3_PUBLIC_URL` to the frontend build/runtime configuration as well; it is
not a secret. The CMS-specific Next.js image allowlist permits only that origin/port
and its `/media/**` path, without query strings. Existing marketplace image rules are
unchanged (their development localhost rule is intentionally broader). Compose wires
the public base into the frontend; production build/deployment wiring remains task 078.

## Deletion, cleanup, and durability

Deleting a media record returns a conflict if any post (published or draft) **or any
retained version** references it, including inline blocks. Post saves/restores and media
deletions lock the same media rows in their database transactions, so a concurrent save
cannot successfully reference a file being deleted. A genuine orphan can be deleted
through the CMS; Payload removes its master and generated variants from object storage.

There is no automatic orphan sweep. To replace an image, upload a new record and edit
the article; keep the old record while retained versions refer to it. The 50-version
limit is not a time-to-live. Do not bypass the CMS guard with direct S3 deletion.

Do **not** apply automatic expiration to current objects under `media/`. Incomplete
multipart uploads may be aborted after seven days where supported. Bucket versioning
and backups should be configured and restore-tested in task 078; do not expire old
object versions before the agreed backup retention window. The runtime does not alter
bucket policies, lifecycle rules, or versioning.

Database writes and S3 writes are not one distributed transaction. Failed uploads or
partial deletes can leave orphaned objects/records. A future operator reconciliation
must inventory database filenames/variants and all retained references, compare them
with bucket keys, wait through the backup/recovery window, and obtain explicit approval
before deletion. Prefer leaving an uncertain object over breaking recoverable content.

CMS containers have no upload filesystem state. Local MinIO retains files in its
existing `minio_data` volume; production retains them at the configured provider.
Restart/redeploy of the CMS keeps file URLs and records intact. Changing the bucket or
public base URL is a media migration, not an ordinary configuration refresh.

## Verification and rollout limits

`pnpm test:integration` creates isolated PostgreSQL, Mailpit, and MinIO services with
synthetic credentials. It verifies restricted storage permissions, transformation and
metadata stripping, public files/private draft metadata, immutable keys, protected
deletion including history and concurrent saves, CMS restart, and version recovery.
It also starts the frontend image optimizer and Chromium to render real MinIO images
at 320 px and 1280 px. Install frontend dependencies and Playwright Chromium first.

`CMS_TEST_IMAGE=szp-cms:local pnpm test:integration` repeats the checks using the
standalone CMS image. `pnpm test:compose` checks the actual development provisioning
overlay on fresh and existing test volumes. Tests remove only their own containers,
networks, and volumes. They never accept production database/storage URLs.

Production provider behavior is configuration-supported, not production-verified.
DNS/TLS, actual policies/credentials, provider limits, backup restore, and rollout remain
task 078 and require separate authorization. No production uploads were performed.

References checked 2026-09-07: [Payload storage adapters](https://payloadcms.com/docs/upload/storage-adapters),
[Payload image sizes](https://payloadcms.com/docs/upload/overview), and
[Hetzner bucket policies/lifecycle](https://docs.hetzner.com/storage/object-storage/faq/buckets-objects/).

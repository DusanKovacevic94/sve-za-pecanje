# 074 — CMS media library and object storage

Status: done
Priority: P1

## Goal

Let editors upload article images using the existing object-storage infrastructure.

## Work

- [x] Configure Payload's S3 adapter with custom endpoint/region/path-style settings for
  local MinIO and the existing production provider. Default to a dedicated CMS bucket.
- [x] Keep object keys, credentials, media metadata, and deletion separate from listing
  uploads and private account exports. Document bucket access and lifecycle settings.
- [x] Validate image contents, byte size, and dimensions; generate appropriate variants,
  strip private metadata, and support cover crops, alt text, captions, and credits.
- [x] Define media visibility: public article images may be publicly addressable, including
  uploads used in drafts. Explain this to editors; do not promise private draft images.
- [x] Limit anonymous media metadata reads to necessary fields associated with published
  content; document whether the adapter serves objects directly or through CMS routes.
- [x] Guard deletion of media referenced by posts or retained versions; define orphan
  cleanup conservatively so version recovery does not restore broken image references.
- [x] Configure frontend image-host allowlisting and test rendering through actual URLs.

## Acceptance criteria

- Upload, transform, render, and delete an unreferenced image against local MinIO.
- Invalid/oversized uploads fail clearly; CMS credentials cannot modify listing objects.
- Cover and inline images retain captions/alt text and work at mobile/desktop sizes.
- CMS restart/redeployment loses no media. Referenced-media deletion is rejected or
  requires an explicit replacement workflow that preserves references.
- Provider limitations and the draft-image visibility policy are documented.

## Primary files

`cms/src/collections/`, `cms/payload.config.*`, `docker-compose.yml`,
`frontend/next.config.js`, `cms/tests/`.

## Dependencies

072, 073. [Payload storage adapters](https://payloadcms.com/docs/upload/storage-adapters).

## Implementation and verification (2026-09-07)

- [Media storage guide](../cms/MEDIA_STORAGE.md) covers environment settings, provider
  limitations, public-file/private-metadata policy, immutable replacements, variants,
  database/version deletion guards, and conservative cleanup/lifecycle requirements.
- Pinned Payload S3 adapter, AWS SDK, Sharp, and MinIO CLI; explicit
  `20260907_121653_media_storage` migration and generated snapshot/types.
- CMS lint, TypeScript, seven unit tests, migration drift check, standalone build,
  and high-threshold dependency audit pass (two existing moderate advisories remain).
- Frontend lint/design-token check, TypeScript, and CMS image allowlist test pass.
- Disposable MinIO/PostgreSQL/Mailpit integration passes against both the local
  standalone process and the non-root Docker image. It verifies upload/decoding/variants,
  metadata stripping and validation failures, isolation from listing/export objects,
  draft/public metadata access, immutable keys, orphan deletion, retained-version
  protection, concurrent save/delete safety, and CMS restart/version recovery.
- Chromium renders real MinIO images through the existing frontend Next.js image
  optimizer at 320 px and 1280 px. Public blog templates remain task 075.
- The separate Compose rehearsal passes fresh and existing-volume provisioning,
  including repeat MinIO bucket/user/policy setup. Production Compose validation passes.

No production buckets, policies, credentials, DNS, or deployment were changed. Actual
provider permissions and backup/restore remain an authorized task 078 rollout check;
Hetzner project-wide keys require separate-project or explicit cross-project isolation.

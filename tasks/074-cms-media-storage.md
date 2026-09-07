# 074 — CMS media library and object storage

Status: todo
Priority: P1

## Goal

Let editors upload article images using the existing object-storage infrastructure.

## Work

- [ ] Configure Payload's S3 adapter with custom endpoint/region/path-style settings for
  local MinIO and the existing production provider. Default to a dedicated CMS bucket.
- [ ] Keep object keys, credentials, media metadata, and deletion separate from listing
  uploads and private account exports. Document bucket access and lifecycle settings.
- [ ] Validate image contents, byte size, and dimensions; generate appropriate variants,
  strip private metadata, and support cover crops, alt text, captions, and credits.
- [ ] Define media visibility: public article images may be publicly addressable, including
  uploads used in drafts. Explain this to editors; do not promise private draft images.
- [ ] Limit anonymous media metadata reads to necessary fields associated with published
  content; document whether the adapter serves objects directly or through CMS routes.
- [ ] Guard deletion of media referenced by posts or retained versions; define orphan
  cleanup conservatively so version recovery does not restore broken image references.
- [ ] Configure frontend image-host allowlisting and test rendering through actual URLs.

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

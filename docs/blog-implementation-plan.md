# Blog implementation plan

Date: 2026-09-07
Status: implementation complete (072–079); authorized rollout pending

## Objective

Let editors publish useful Serbian fishing guides through a browser editor, attract
readers to relevant marketplace listings, and measure that transition.

## Agreed architecture

- Add a self-hosted Payload application under `cms/` in this application repository,
  with its own package manifest, lockfile, supported dependencies, and Docker service.
- Keep public pages in the existing frontend: `/blog` and `/blog/[slug]`.
- Serve the editor at `https://cms.svezapecanje.rs/admin` through Caddy. The CMS
  hostname serves administration/content APIs; it is not a second public blog.
- Reuse the PostgreSQL instance with a separate `svezapecanje_cms` database and
  dedicated role. Payload owns its migrations; Alembic owns marketplace migrations.
- Reuse the S3-compatible storage provider. Default to a dedicated CMS bucket and
  credentials. Use local MinIO for integration tests; confirm production provider
  compatibility before rollout. Marketplace upload records are not CMS media records.
- Keep CMS users separate from marketplace accounts. No public editor registration.
- Fetch published content from the frontend server. Resolve marketplace references
  through FastAPI; do not give Payload access to marketplace tables.
- Publishing refreshes frontend content without a build or deployment. Preview is
  authenticated, uncached, and excluded from indexing.

The current frontend lockfile resolves Next.js 15.5.19. Select and lock a supported
Payload/Next.js/React/Node combination in task 072 using current upstream requirements;
do not assume the CMS and public frontend can share dependency versions.

## Delivery sequence

| Task | Outcome | Prerequisites |
| --- | --- | --- |
| [072](../tasks/072-payload-cms-foundation.md) | Local CMS, isolated database, migrations | None |
| [073](../tasks/073-blog-content-editor-access.md) | Article model and editor publishing permissions | 072 |
| [074](../tasks/074-cms-media-storage.md) | Media library backed by object storage | 072, 073 |
| [075](../tasks/075-public-blog-pages-seo.md) | Branded public pages and search metadata | 073, 074 |
| [076](../tasks/076-blog-preview-publishing-cache.md) | Secure preview and publish/unpublish propagation | 073, 075 |
| [077](../tasks/077-blog-marketplace-discovery-metrics.md) | Related inventory and content engagement measurement | 075, 076 |
| [078](../tasks/078-cms-deployment-backups.md) | Production configuration, CMS hostname, backup/restore | 072, 074, 076 |
| [079](../tasks/079-blog-release-gate-editor-handoff.md) | Integrated release evidence and editor handoff | 072–078 |

Tasks 072–079 have completed their local implementation and verification. The
[release checklist](blog-release-checklist.md) records the final gates and editor handoff.
Hosted CI, production access/deployment, analytics enablement and first publication
remain separately authorized operational steps; task completion does not perform them.

## First-release boundaries

Include articles, author profiles, media, drafts/autosave/version recovery, manual
publishing, previews, stable slugs, SEO, related marketplace categories, and analytics.
Editors may edit drafts freely; after first publication, slugs are immutable in v1.
Author profiles are public editorial identities, distinct from private CMS logins.

Defer scheduled publication, newsletters, comments, public contributors, full-text blog
search, public tag/author archives, arbitrary page builders, and multilingual workflows.
Do not automatically publish generated articles or seed production with demo posts.

Proposed defaults: administrators manage users; editors manage and publish articles.
Use a dedicated CMS bucket. These are implementation defaults, not new brand rules.

## Brand and editorial ownership

Follow the sibling Brand Manager instructions and the
[blog brief](../../sve-za-pecanje-brand-manager/work/briefs/2026-09-07-blog-editorial-experience.md).
Keep briefs, formal reviews, and standalone creative deliverables there. Application
routes and content integration live here. The approved logo family remains immutable.
Use Serbian Latin for reader-facing content, including correct `č ć ž š đ` characters.

## Release conditions

- Drafts and editor credentials never appear in public responses, metadata, or caches.
- Editing a published article as a draft leaves its live version intact until published.
- Publish, update, and unpublish behavior is verified with production-mode caching.
- CMS failure does not break marketplace browsing or prevent frontend image builds.
- Both databases and CMS media have documented backup and restore procedures.
- DNS, provisioning, production access, deployment, external messages, and publishing
  real articles require explicit authorization when that operational work is requested.
  Completing these tasks does not itself authorize those actions.

## Upstream implementation references

Checked on 2026-09-07; recheck against the versions selected during implementation.

- [Payload installation and compatibility](https://payloadcms.com/docs/getting-started/installation)
- [PostgreSQL adapter and migration options](https://payloadcms.com/docs/database/postgres)
- [Drafts and autosave](https://payloadcms.com/docs/versions/drafts)
- [Object storage adapters](https://payloadcms.com/docs/upload/storage-adapters)
- [Server-side preview](https://payloadcms.com/docs/live-preview/server)
- [Next.js cache invalidation](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

Use cache APIs supported by the public frontend's installed Next.js version; the
separate CMS may use a different major version.

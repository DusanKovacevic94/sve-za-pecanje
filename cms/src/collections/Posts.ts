import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type Where } from 'payload'
import { editorField, editors, isEditor, published } from '../access'
import { inspectBody, relationshipID, slugPattern } from '../content'
import { articleEditor } from '../editor'
import { lockPostMedia } from '../media-references'
import { blogChanged, blogDeleted, blogPreviewURL } from '../hooks/blog'
import { validateMarketplaceCategory } from '../marketplace'
import { normalizeSocialOverride } from '../social-card/copy'
import socialLayout from '../../assets/social/blog-card-layout.json'

const protectPublication: CollectionBeforeChangeHook = async ({ data, originalDoc, req, context }) => {
  const merged = { ...originalDoc, ...data }
  await lockPostMedia(req, merged)
  // Read the canonical row, not the latest draft/version, to preserve publication history
  // even when restoring a version created before the article's first publication.
  const canonical = originalDoc?.id ? await req.payload.findByID({
    collection: 'posts', id: originalDoc.id, draft: false, depth: 0, overrideAccess: true, req,
  }) : undefined
  if (canonical?.firstPublishedAt && merged.slug !== canonical.slug) {
    throw new APIError('An article slug cannot change after first publication.', 400)
  }
  data.firstPublishedAt = canonical?.firstPublishedAt || null
  if (merged.slug) {
    if (merged.slug === 'preview') throw new APIError('This slug is reserved for editorial preview.', 400)
    if (!slugPattern.test(merged.slug)) throw new APIError('Use lowercase letters, numbers, and single hyphens in slugs.', 400)
    const where: Where = { and: [{ slug: { equals: merged.slug } }, ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : [])] }
    for (const draft of [false, true]) {
      const collision = await req.payload.find({ collection: 'posts', where, draft, limit: 1, depth: 0, overrideAccess: true, req })
      if (collision.totalDocs) throw new APIError('This article slug is already in use.', 400)
    }
  }
  const body = merged.body ? inspectBody(merged.body) : undefined
  if (merged._status === 'published' && !context.cmsSavingDraft) {
    const categoryValidation = await validateMarketplaceCategory(merged.marketplaceCategorySlug)
    if (categoryValidation !== true) throw new APIError(categoryValidation, 400)
    for (const field of ['title', 'slug', 'excerpt', 'seoTitle', 'seoDescription']) {
      if (typeof merged[field] !== 'string' || !merged[field].trim()) throw new APIError(`Complete ${field} before publishing.`, 400)
    }
    if (!body?.text) throw new APIError('Add article text before publishing.', 400)
    const authorID = relationshipID(merged.author)
    const coverID = relationshipID(merged.coverImage)
    if (!authorID || !coverID) throw new APIError('Choose a public author and cover image before publishing.', 400)
    const author = await req.payload.findByID({ collection: 'authors', id: authorID, depth: 0, req })
    if (!author.isPublic || !author.name.trim()) throw new APIError('The author profile must be public.', 400)
    for (const id of new Set([coverID, ...body.media])) {
      const image = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
      if (!image.isPublic || !image.alt.trim() || !image.filename) throw new APIError('Article images must have an uploaded file, be public, and have alt text.', 400)
    }
    data.firstPublishedAt ||= new Date().toISOString()
    if (merged.substantiveUpdatedAt) {
      const date = Date.parse(merged.substantiveUpdatedAt)
      if (!Number.isFinite(date) || date < Date.parse(data.firstPublishedAt) || date > Date.now()) {
        throw new APIError('Substantive update time must be between first publication and now.', 400)
      }
    }
  }
  return data
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'firstPublishedAt'], preview: blogPreviewURL },
  versions: { drafts: { autosave: { interval: 1500 }, validate: false }, maxPerDoc: 50 },
  access: { read: published, create: editors, update: editors, delete: editors, readVersions: editors },
  hooks: {
    beforeOperation: [({ args, operation, req }) => {
      // Never allow anonymous draft=true to switch the query to historical versions,
      // especially after unpublish. This also covers nested relationship reads.
      if (!('overrideAccess' in args && args.overrideAccess) && !isEditor(req.user) && 'draft' in args) args.draft = false
      if (['create', 'update', 'restoreVersion'].includes(operation)) {
        req.context.cmsSavingDraft = 'draft' in args && args.draft === true &&
          !('data' in args && args.data?._status === 'published')
      }
      return args
    }],
    beforeChange: [protectPublication],
    afterChange: [blogChanged],
    afterDelete: [blogDeleted],
  },
  fields: [
    { name: 'title', type: 'text', maxLength: 180 },
    { name: 'slug', type: 'text', unique: true, index: true, maxLength: 180 },
    { name: 'excerpt', type: 'textarea', maxLength: 400 },
    { name: 'body', type: 'richText', editor: articleEditor },
    { name: 'author', type: 'relationship', relationTo: 'authors' },
    { name: 'coverImage', type: 'relationship', relationTo: 'media' },
    { name: 'seoTitle', type: 'text', maxLength: 70 },
    { name: 'seoDescription', type: 'textarea', maxLength: 180 },
    {
      name: 'socialTitle', type: 'text', label: 'Naslov za društvene mreže',
      maxLength: socialLayout.title.maxCharacters,
      access: { read: editorField, create: editorField, update: editorField },
      hooks: { beforeValidate: [({ value }) => normalizeSocialOverride(value, 'title')] },
      admin: { description: 'Opciono, do 100 znakova. Prazno polje koristi naslov članka. Za sliku može biti potreban kraći naslov; naslov članka se ne menja.' },
    },
    {
      name: 'socialDescription', type: 'textarea', label: 'Opis za društvene mreže',
      maxLength: socialLayout.description.maxCharacters,
      access: { read: editorField, create: editorField, update: editorField },
      hooks: { beforeValidate: [({ value }) => normalizeSocialOverride(value, 'description')] },
      admin: { description: 'Opciono, do 180 znakova. Prazno polje koristi uvod članka (Excerpt). Tekst za sliku je vidljiv samo urednicima. Proveri sliku u pregledu ispod.' },
    },
    { name: 'socialPreview', type: 'ui', admin: { components: { Field: '/social-card/SocialPreview#SocialPreview' } } },
    { name: 'firstPublishedAt', type: 'date', admin: { readOnly: true } },
    { name: 'substantiveUpdatedAt', type: 'date', admin: { description: 'Set only for a meaningful editorial update, not a typo or autosave.' } },
    { name: 'marketplaceCategorySlug', type: 'text', maxLength: 180, admin: { description: 'Optional: copy the slug after /kategorije/ in a marketplace category URL. FastAPI checks it at publication; drafts remain saveable during outages. Clear it to omit related equipment.' }, validate: (value: unknown) => !value || (typeof value === 'string' && slugPattern.test(value)) || 'Use a marketplace category slug.' },
    { name: 'internalNotes', type: 'textarea', access: { read: editorField } },
  ],
}

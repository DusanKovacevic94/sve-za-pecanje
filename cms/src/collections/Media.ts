import { APIError, type CollectionConfig } from 'payload'
import { editorField, editors, isEditor } from '../access'
import { sanitizeImage } from '../media-images'
import { protectMediaDeletion, publishedMedia } from '../media-references'
import { CMS_MEDIA_PREFIX } from '../storage'
import { blogChanged, blogDeleted } from '../hooks/blog'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'alt', description: 'Image files are publicly addressable, even in drafts. Never upload confidential material. To change an image or its crop, upload a new file.' },
  access: { read: publishedMedia, create: editors, update: editors, delete: editors },
  upload: {
    disableLocalStorage: true, pasteURL: false, crop: false, focalPoint: false,
    hideRemoveFile: true, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    adminThumbnail: 'thumbnail',
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 180, fit: 'cover', position: 'centre', formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'coverMobile', width: 640, height: 360, fit: 'cover', position: 'centre', formatOptions: { format: 'webp', options: { quality: 82 } } },
      { name: 'coverDesktop', width: 1280, height: 720, fit: 'cover', position: 'centre', formatOptions: { format: 'webp', options: { quality: 85 } } },
      { name: 'inline', width: 768, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 85 } } },
    ],
  },
  hooks: {
    afterChange: [blogChanged],
    afterDelete: [blogDeleted],
    beforeOperation: [async ({ args, operation, req }) => {
      if (!['create', 'update'].includes(operation)) return args
      if (!('overrideAccess' in args && args.overrideAccess) && !isEditor(req.user)) throw new APIError('Editor access is required.', 403)
      if ('duplicateFromID' in args && args.duplicateFromID) throw new APIError('Upload a new image instead of duplicating a media record.', 400)
      if (operation === 'update' && req.file) throw new APIError('Image files are immutable. Upload the replacement as a new media record.', 400)
      if (req.query?.uploadEdits) throw new APIError('Upload a newly cropped image as a separate media record.', 400)
      if ('data' in args && args.data) {
        const data = args.data as Record<string, unknown>
        // Native upload fields are server-owned. Do not allow API callers to point
        // deletion/resize at somebody else's key or trigger remote URL fetching.
        for (const key of ['filename', 'url', 'thumbnailURL', 'sizes', 'mimeType', 'filesize', 'width', 'height', 'focalX', 'focalY', 'prefix']) delete data[key]
        data.prefix = CMS_MEDIA_PREFIX
      }
      if (operation === 'create') {
        if (!req.file) throw new APIError('Choose an image file to upload.', 400)
        req.file = await sanitizeImage(req.file)
      }
      return args
    }],
    beforeDelete: [async ({ req, id }) => protectMediaDeletion(req, id)],
    afterRead: [({ doc, req, overrideAccess }) => {
      if (overrideAccess || isEditor(req.user)) return doc
      const pick = (value: Record<string, unknown>, fields: string[]) => Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
      return {
        ...pick(doc, ['id', 'alt', 'caption', 'credit', 'url', 'width', 'height', 'mimeType']),
        sizes: Object.fromEntries(Object.entries(doc.sizes || {}).map(([key, value]) => [key, pick(value as Record<string, unknown>, ['url', 'width', 'height', 'mimeType'])])),
      }
    }],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, maxLength: 300 },
    { name: 'caption', type: 'textarea', maxLength: 600 },
    { name: 'credit', type: 'text', maxLength: 300 },
    { name: 'isPublic', type: 'checkbox', defaultValue: false, required: true },
    { name: 'internalNotes', type: 'textarea', access: { read: editorField } },
  ],
}

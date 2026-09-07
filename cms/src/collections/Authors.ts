import type { CollectionConfig } from 'payload'
import { editorField, editors, publicMetadata } from '../access'
import { blogChanged, blogDeleted } from '../hooks/blog'

// Public editorial identities deliberately have no relationship to private logins.
export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: { useAsTitle: 'name' },
  access: { read: publicMetadata, create: editors, update: editors, delete: editors },
  hooks: { afterChange: [blogChanged], afterDelete: [blogDeleted] },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'bio', type: 'textarea', maxLength: 600 },
    { name: 'isPublic', type: 'checkbox', defaultValue: false, required: true },
    { name: 'internalNotes', type: 'textarea', access: { read: editorField } },
  ],
}

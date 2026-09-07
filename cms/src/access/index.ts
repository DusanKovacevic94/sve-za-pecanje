import type { Access, FieldAccess, PayloadRequest } from 'payload'

export const isAdmin = (user: PayloadRequest['user']) => user?.collection === 'users' && user.role === 'admin'
export const isEditor = (user: PayloadRequest['user']) => user?.collection === 'users' && ['admin', 'editor'].includes(user.role)
export const administrators: Access = ({ req }) => isAdmin(req.user)
export const editors: Access = ({ req }) => isEditor(req.user)
export const editorField: FieldAccess = ({ req }) => isEditor(req.user)
export const administratorField: FieldAccess = ({ req }) => isAdmin(req.user)
export const publicMetadata: Access = ({ req }) => isEditor(req.user) || { isPublic: { equals: true } }
export const published: Access = ({ req }) => isEditor(req.user) || { _status: { equals: 'published' } }

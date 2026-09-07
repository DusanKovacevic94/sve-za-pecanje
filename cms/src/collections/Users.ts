import { APIError, type CollectionConfig } from 'payload'
import { administratorField, administrators, isAdmin, isEditor } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600_000,
    cookies: { sameSite: 'Lax', secure: process.env.CMS_ENV === 'production' },
    tokenExpiration: 7200,
    forgotPassword: { expiration: 30 * 60 * 1000 },
  },
  access: {
    admin: ({ req }) => isEditor(req.user),
    create: administrators,
    read: ({ req }) => isAdmin(req.user) || (isEditor(req.user) ? { id: { equals: req.user!.id } } : false),
    update: administrators,
    delete: administrators,
    unlock: administrators,
  },
  hooks: {
    beforeOperation: [({ args, operation }) => {
      if (['create', 'update', 'resetPassword'].includes(operation) && 'data' in args && args.data?.password !== undefined) {
        if (typeof args.data.password !== 'string' || args.data.password.length < 16) {
          throw new APIError('Use a password with at least 16 characters.', 400)
        }
      }
      return args
    }],
    beforeChange: [({ req, context, operation, data }) => {
      // Payload's first-user operation can bypass create access. Enforce this again
      // in the write hook. Only our local bootstrap command sets this trusted context.
      if (operation === 'create' && !req.user && context.bootstrapAdmin !== true) {
        throw new APIError('Use the local administrator bootstrap command.', 403)
      }
      return data
    }],
  },
  fields: [{
    name: 'role', type: 'select', required: true, defaultValue: 'editor', saveToJWT: false,
    options: [{ label: 'Administrator', value: 'admin' }, { label: 'Editor', value: 'editor' }],
    access: { create: administratorField, update: administratorField },
  }],
}

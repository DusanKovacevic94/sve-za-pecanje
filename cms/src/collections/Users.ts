import { APIError, type CollectionConfig } from 'payload'

// All CMS accounts are administrators during foundation setup. Editorial roles land in 073.
const signedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600_000,
    cookies: { sameSite: 'Lax', secure: process.env.CMS_ENV === 'production' },
  },
  access: {
    admin: signedIn,
    create: signedIn,
    read: signedIn,
    update: signedIn,
    delete: signedIn,
    unlock: signedIn,
  },
  hooks: {
    beforeChange: [({ req, context, operation, data }) => {
      // Payload's first-user operation can bypass create access. Enforce this again
      // in the write hook. Only our local bootstrap command sets this trusted context.
      if (operation === 'create' && !req.user && context.bootstrapAdmin !== true) {
        throw new APIError('Use the local administrator bootstrap command.', 403)
      }
      return data
    }],
  },
  fields: [],
}

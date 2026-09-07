import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'
import { Users } from './collections/Users'
import { Authors } from './collections/Authors'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { cmsEmail } from './email'
import { cmsEnvironment } from './environment'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { CMS_MEDIA_PREFIX, mediaURL, storageEnvironment } from './storage'
import { MAX_IMAGE_BYTES } from './media-images'
import { blogPreviewEndpoint } from './hooks/blog'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const env = cmsEnvironment()
const storage = storageEnvironment()

export default buildConfig({
  secret: env.secret,
  serverURL: env.url,
  cookiePrefix: 'szp-cms',
  cors: [env.url],
  csrf: [env.url],
  telemetry: false,
  graphQL: { disable: true },
  endpoints: [blogPreviewEndpoint],
  email: await cmsEmail(),
  sharp,
  upload: { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 }, abortOnLimit: true },
  plugins: [s3Storage({
    bucket: storage.bucket, config: storage.config, clientUploads: false,
    collections: { media: {
      prefix: CMS_MEDIA_PREFIX, disablePayloadAccessControl: true,
      generateFileURL: ({ filename }) => mediaURL(storage.publicURL, filename),
    } },
  })],
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: '— Sve Za Pecanje CMS' },
  },
  collections: [Users, Authors, Media, Posts],
  db: postgresAdapter({
    pool: { connectionString: env.databaseURL, max: 5, connectionTimeoutMillis: 5000 },
    push: false,
    disableCreateDatabase: true,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})

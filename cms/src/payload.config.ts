import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'
import { Users } from './collections/Users'
import { cmsEnvironment } from './environment'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const env = cmsEnvironment()

export default buildConfig({
  secret: env.secret,
  serverURL: env.url,
  cookiePrefix: 'szp-cms',
  cors: [env.url],
  csrf: [env.url],
  telemetry: false,
  graphQL: { disable: true },
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: '— Sve Za Pecanje CMS' },
  },
  collections: [Users],
  db: postgresAdapter({
    pool: { connectionString: env.databaseURL, max: 5, connectionTimeoutMillis: 5000 },
    push: false,
    disableCreateDatabase: true,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})

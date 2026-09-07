export const CMS_DATABASE = 'svezapecanje_cms'
export const CMS_DATABASE_USER = 'szp_cms'

type Environment = Record<string, string | undefined>

export function databaseURL(env: Environment = process.env): string {
  const password = env.CMS_DATABASE_PASSWORD
  if (!password || password.length < 16) {
    throw new Error('CMS_DATABASE_PASSWORD must contain at least 16 characters.')
  }
  const port = env.CMS_DATABASE_PORT || '5432'
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('CMS_DATABASE_PORT must be a valid TCP port.')
  }
  const url = new URL(`postgresql://localhost:${port}/${CMS_DATABASE}`)
  url.hostname = env.CMS_DATABASE_HOST || '127.0.0.1'
  url.username = CMS_DATABASE_USER
  url.password = password
  return url.toString()
}

export function cmsEnvironment(env: Environment = process.env) {
  // Build-time imports need configuration, but never initialize a database connection.
  // The build wrapper supplies this flag only to the build child; runtime requires secrets.
  if (env.CMS_BUILD === 'true') {
    return {
      secret: 'cms-build-only-not-a-runtime-secret-000000000',
      url: 'http://localhost:3002',
      databaseURL: 'postgresql://szp_cms:build-only@127.0.0.1:1/svezapecanje_cms',
      secureCookies: false,
    }
  }
  if (!['development', 'test', 'production'].includes(env.CMS_ENV || '')) {
    throw new Error('CMS_ENV must be development, test, or production.')
  }
  if (!env.CMS_SECRET || env.CMS_SECRET.length < 32) {
    throw new Error('CMS_SECRET must contain at least 32 characters.')
  }
  const url = new URL(env.CMS_PUBLIC_URL || 'http://localhost:3002')
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash) {
    throw new Error('CMS_PUBLIC_URL must be an HTTP(S) origin without credentials or a path.')
  }
  if (env.CMS_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('CMS_PUBLIC_URL must use HTTPS in production.')
  }
  return {
    secret: env.CMS_SECRET,
    url: url.origin,
    databaseURL: databaseURL(env),
    secureCookies: url.protocol === 'https:',
  }
}

export function requireLocalMaintenance(env: Environment = process.env) {
  if (!['development', 'test'].includes(env.CMS_ENV || '')) {
    throw new Error('This maintenance command is restricted to development/test environments.')
  }
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(env.CMS_DATABASE_HOST || '127.0.0.1')) {
    throw new Error('Local maintenance requires a loopback or local Compose PostgreSQL host.')
  }
}

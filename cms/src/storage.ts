import type { S3ClientConfig } from '@aws-sdk/client-s3'

export const CMS_MEDIA_BUCKET = 'svezapecanje-cms'
export const CMS_MEDIA_PREFIX = 'media'
export function storageEnvironment(env: Record<string, string | undefined> = process.env) {
  const build = env.CMS_BUILD === 'true'
  const endpoint = new URL(build ? 'http://127.0.0.1:1' : env.CMS_S3_ENDPOINT || 'http://127.0.0.1:9000')
  const publicURL = new URL(build ? `http://localhost:9000/${CMS_MEDIA_BUCKET}` : env.CMS_S3_PUBLIC_URL || `http://localhost:9000/${CMS_MEDIA_BUCKET}`)
  for (const url of [endpoint, publicURL]) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || /[%*]/.test(url.pathname)) {
      throw new Error('CMS storage URLs must be HTTP(S) URLs without credentials, queries, or wildcard paths.')
    }
    if (!build && env.CMS_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production CMS storage requires HTTPS.')
  }
  if (endpoint.pathname !== '/') throw new Error('CMS_S3_ENDPOINT must be an origin.')
  const bucket = env.CMS_S3_BUCKET || CMS_MEDIA_BUCKET
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket === 'fishing-marketplace' || bucket === env.S3_BUCKET || bucket === env.HETZNER_STORAGE_BUCKET) {
    throw new Error('Use a dedicated CMS bucket, never the marketplace bucket.')
  }
  const accessKeyId = build ? 'cms-build-only' : env.CMS_S3_ACCESS_KEY_ID
  const secretAccessKey = build ? 'cms-build-only-not-a-secret' : env.CMS_S3_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey || secretAccessKey.length < 16) throw new Error('Provide dedicated CMS_S3_ACCESS_KEY_ID and CMS_S3_SECRET_ACCESS_KEY (16+ characters).')
  if (env.CMS_S3_FORCE_PATH_STYLE && !['true', 'false'].includes(env.CMS_S3_FORCE_PATH_STYLE)) throw new Error('CMS_S3_FORCE_PATH_STYLE must be true or false.')
  const config: S3ClientConfig = {
    endpoint: endpoint.origin, region: env.CMS_S3_REGION || 'us-east-1',
    forcePathStyle: env.CMS_S3_FORCE_PATH_STYLE !== 'false', credentials: { accessKeyId, secretAccessKey },
    // S3-compatible providers may not support AWS's optional checksum trailers.
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  }
  return { bucket, config, publicURL: publicURL.toString().replace(/\/$/, '') }
}

export function mediaURL(base: string, filename: string) {
  // Object names are generated UUIDs; never interpret a client-provided path.
  if (!/^[a-zA-Z0-9_-]+\.(webp|jpg|png)$/.test(filename)) throw new Error('Invalid CMS media filename.')
  return `${base}/${CMS_MEDIA_PREFIX}/${encodeURIComponent(filename)}`
}

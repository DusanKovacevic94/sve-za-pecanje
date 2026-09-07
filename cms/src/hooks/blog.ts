import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Endpoint,
  GeneratePreviewURL,
} from 'payload'
import { isEditor } from '../access'
import { signPreview, signature, verifyPreview } from '../blog-signing'

function frontendOrigin() {
  const url = new URL(process.env.CMS_FRONTEND_URL || 'http://localhost:3000')
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (process.env.CMS_ENV === 'production' && url.protocol !== 'https:')
  )
    throw new Error('Invalid CMS_FRONTEND_URL')
  return url.origin
}
export const blogPreviewURL: GeneratePreviewURL = (doc, { req }) => {
  if (!isEditor(req.user) || !doc.id || !process.env.CMS_PREVIEW_SECRET)
    return null
  const token = signPreview({
    purpose: 'handoff',
    post: String(doc.id),
    editor: String(req.user!.id),
    exp: Math.floor(Date.now() / 1000) + 60,
  })
  return `${frontendOrigin()}/blog/preview/start#token=${token}`
}
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}
export const blogPreviewEndpoint: Endpoint = {
  path: '/blog-preview/:id',
  method: 'get',
  handler: async (req) => {
    const token =
      req.headers.get('authorization')?.replace(/^Bearer /, '') || ''
    const claims = verifyPreview(token, 'read')
    if (!claims || String(req.routeParams?.id) !== claims.post)
      return new Response(null, { status: 401, headers: privateHeaders })
    try {
      // Recheck the current account for every read; a demotion/deletion revokes
      // access even if the signed frontend session has not expired yet.
      const user = await req.payload.findByID({
        collection: 'users',
        id: Number(claims.editor),
        overrideAccess: true,
        depth: 0,
        req,
      })
      if (
        !['admin', 'editor'].includes(user.role) ||
        (user.lockUntil && Date.parse(user.lockUntil) > Date.now())
      )
        return new Response(null, { status: 403, headers: privateHeaders })
      const post = await req.payload.findByID({
        collection: 'posts',
        id: Number(claims.post),
        draft: true,
        overrideAccess: true,
        depth: 2,
        req,
      })
      // This endpoint is server-to-server only. The frontend maps a strict
      // allowlist and never forwards CMS JSON, private notes or user records.
      return Response.json(post, { headers: privateHeaders })
    } catch {
      return new Response(null, { status: 404, headers: privateHeaders })
    }
  },
}

type Event = {
  version: 1
  collection: 'posts' | 'authors' | 'media'
  operation: 'change' | 'delete'
  id: string
}
export async function deliverBlogEvent(
  event: Event,
  warn: () => void,
  fetcher: typeof fetch = fetch,
) {
  if (!process.env.CMS_REVALIDATE_SECRET || !process.env.CMS_REVALIDATE_URL)
    return
  const body = JSON.stringify(event)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = new URL(process.env.CMS_REVALIDATE_URL)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/api/blog/revalidate' ||
        url.search ||
        url.hash
      )
        throw new Error()
      const timestamp = String(Date.now())
      const response = await fetcher(url, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(1000),
        headers: {
          'Content-Type': 'application/json',
          'x-blog-timestamp': timestamp,
          'x-blog-signature': signature(
            `${timestamp}.${body}`,
            'CMS_REVALIDATE_SECRET',
          ),
        },
        body,
      })
      await response.body?.cancel()
      if (response.ok) return
    } catch {
      /* Never log signed requests, credentials, URLs or draft data. */
    }
    if (attempt < 2)
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
  }
  warn()
  // Public reads are uncached and reconcile on the next request even if this
  // process exits or every attempt fails; correctness needs no durable queue.
}
export const blogChanged: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  collection,
  req,
  context,
}) => {
  if (
    collection.slug === 'posts' &&
    (context.cmsSavingDraft ||
      (doc._status !== 'published' && previousDoc?._status !== 'published'))
  )
    return doc
  await deliverBlogEvent(
    {
      version: 1,
      collection: collection.slug as Event['collection'],
      operation: 'change',
      id: String(doc.id),
    },
    () =>
      req.payload.logger.warn(
        'Blog invalidation delivery failed; uncached reads reconcile on the next request.',
      ),
  )
  return doc
}
export const blogDeleted: CollectionAfterDeleteHook = async ({
  doc,
  collection,
  req,
}) => {
  if (collection.slug === 'posts' && doc._status !== 'published') return doc
  await deliverBlogEvent(
    {
      version: 1,
      collection: collection.slug as Event['collection'],
      operation: 'delete',
      id: String(doc.id),
    },
    () =>
      req.payload.logger.warn(
        'Blog invalidation delivery failed; uncached reads reconcile on the next request.',
      ),
  )
  return doc
}

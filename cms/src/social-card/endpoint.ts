import type { Endpoint } from 'payload'
import { isEditor } from '../access'
import { renderSocialCard, SocialCardError } from './index'
import { validateSocialCardInput } from './contract'

const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie, Origin, Authorization',
}
const fail = (status: number, message: string, retry = false) => Response.json({ message }, {
  status, headers: { ...headers, ...(retry ? { 'Retry-After': '60' } : {}) },
})

// Fixed one-minute windows, bounded by the global budget; no draft data or timers retained.
export function createRenderBudget(now = Date.now) {
  let windowStart = now(), total = 0
  const users = new Map<string, number>()
  return (id: string) => {
    if (now() - windowStart >= 60_000) { windowStart = now(); total = 0; users.clear() }
    const count = users.get(id) || 0
    if (count >= 6 || total >= 60) return false
    users.set(id, count + 1)
    total++
    return true
  }
}

export async function readRenderBody(req: { headers: Headers; body?: Request['body'] }, timeoutMs = 3000): Promise<unknown> {
  const max = 4096
  if (Number(req.headers.get('content-length')) > max) throw new RangeError()
  const reader = req.body?.getReader()
  if (!reader) throw new SyntaxError()
  let timer: ReturnType<typeof setTimeout> | undefined
  let complete = false
  try {
    return await Promise.race([
      (async () => {
        const chunks: Uint8Array[] = []
        let size = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > max) throw new RangeError()
          chunks.push(value)
        }
        complete = true
        return JSON.parse(Buffer.concat(chunks).toString('utf8'))
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs) }),
    ])
  } finally {
    clearTimeout(timer)
    if (!complete) void reader.cancel().catch(() => undefined)
  }
}

export function createSocialPreviewEndpoint(render = renderSocialCard, budget = createRenderBudget()): Endpoint {
  return {
    path: '/social-preview/:id', method: 'post',
    handler: async req => {
      if (!isEditor(req.user) || (req.user?.lockUntil && Date.parse(req.user.lockUntil) > Date.now())) {
        return fail(401, 'Prijavi se kao urednik da pripremiš sliku.')
      }
      // Require an explicit trusted origin even for API-token requests. No public handoffs.
      if (req.headers.get('origin') !== new URL(req.payload.config.serverURL).origin ||
        (req.headers.has('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin')) {
        return fail(403, 'Otvori pregled iz CMS urednika.')
      }
      if (!budget(String(req.user!.id))) return fail(429, 'Previše zahteva za sliku. Sačekaj minut i pokušaj ponovo.', true)
      if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
        return fail(415, 'Pošalji naslov i opis kao JSON tekst.')
      }
      const id = String(req.routeParams?.id || '')
      if (!/^[1-9]\d{0,14}$/.test(id)) return fail(404, 'Sačuvaj nacrt pre pripreme slike.')
      try {
        await req.payload.findByID({ collection: 'posts', id: Number(id), draft: true, depth: 0, overrideAccess: false, req })
      } catch { return fail(404, 'Članak nije dostupan. Otvori postojeći nacrt.') }
      let input: unknown
      try { input = await readRenderBody(req) } catch (error) {
        return fail(error instanceof RangeError ? 413 : 400, 'Zahtev nije ispravan ili je prevelik. Unesi kratak naslov i opis pa pokušaj ponovo.')
      }
      try {
        const result = await render(validateSocialCardInput(input), { signal: req.signal })
        return new Response(new Uint8Array(result.jpeg), { headers: {
          ...headers, 'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="svezapecanje-blog-${id}.jpg"`,
        } })
      } catch (error) {
        const safe = error instanceof SocialCardError ? error : new SocialCardError('unavailable')
        const status = ['invalid_input', 'overflow', 'unsupported_glyph'].includes(safe.code) ? 422 : safe.code === 'busy' ? 429 : 503
        return fail(status, safe.message, status === 429)
      }
    },
  }
}

export const socialPreviewEndpoint = createSocialPreviewEndpoint()

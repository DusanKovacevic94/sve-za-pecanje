import assert from 'node:assert/strict'
import test from 'node:test'
import type { PayloadRequest } from 'payload'
import { createRenderBudget, createSocialPreviewEndpoint, readRenderBody } from '../src/social-card/endpoint'
import { SocialCardError, type SocialCardResult } from '../src/social-card/contract'

const input = { title: 'Probni naslov', description: 'Kratak opis.' }
function request(options: { user?: unknown; origin?: string; body?: string; exists?: boolean; type?: string; id?: string } = {}) {
  const req = new Request('http://cms.test/api/social-preview/1', {
    method: 'POST', headers: { Origin: options.origin ?? 'http://cms.test', 'Content-Type': options.type ?? 'application/json' },
    body: options.body ?? JSON.stringify(input),
  })
  return Object.assign(req, {
    user: 'user' in options ? options.user : { id: 1, collection: 'users', role: 'editor' },
    routeParams: { id: options.id ?? '1' },
    payload: { config: { serverURL: 'http://cms.test' }, findByID: async (args: Record<string, unknown>) => {
      assert.equal(args.overrideAccess, false)
      assert.equal(args.draft, true)
      if (options.exists === false) throw new Error('private DB detail')
      return { id: 1 }
    } },
  }) as unknown as PayloadRequest
}

test('render endpoint fails closed and returns only a private JPEG without persisting supplied copy', async () => {
  let calls = 0
  const handler = createSocialPreviewEndpoint(async copy => {
    calls++
    assert.deepEqual(copy, input)
    return { jpeg: Buffer.from('jpeg') } as SocialCardResult
  }, () => true).handler
  for (const [options, status] of [
    [{ user: null }, 401], [{ user: { collection: 'users', role: 'reader' } }, 401],
    [{ origin: 'http://evil.test' }, 403], [{ origin: '' }, 403],
    [{ type: 'text/plain' }, 415], [{ id: '../2' }, 404], [{ exists: false }, 404],
    [{ body: 'x'.repeat(4097) }, 413], [{ body: '{' }, 400],
    [{ body: JSON.stringify({ ...input, url: 'http://secret.test' }) }, 422],
    [{ body: JSON.stringify({ ...input, title: '' }) }, 422],
  ] as const) {
    const response = await handler(request(options))
    assert.equal(response.status, status)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.doesNotMatch(await response.text(), /private DB detail|secret.test/)
  }
  assert.equal(calls, 0)
  const response = await handler(request())
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(await response.text(), 'jpeg')
  assert.equal(calls, 1)
})

test('render budgets bound per-editor and process load and recover after a minute', async () => {
  let time = 0
  const budget = createRenderBudget(() => time)
  for (let i = 0; i < 6; i++) assert.ok(budget('1'))
  assert.equal(budget('1'), false)
  for (let i = 0; i < 54; i++) assert.ok(budget(`other-${i}`))
  assert.equal(budget('new'), false)
  time = 60_000
  assert.ok(budget('1'))
  const response = await createSocialPreviewEndpoint(undefined, () => false).handler(request())
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '60')
})

test('renderer errors are actionable and unknown errors do not expose internals', async () => {
  for (const [error, status] of [[new SocialCardError('overflow'), 422], [new SocialCardError('busy'), 429],
    [new SocialCardError('timeout'), 503], [new Error('SECRET filesystem path'), 503]] as const) {
    const response = await createSocialPreviewEndpoint(async () => { throw error }, () => true).handler(request())
    assert.equal(response.status, status)
    assert.doesNotMatch(await response.text(), /SECRET|filesystem/)
  }
})

test('body reader enforces actual streamed bytes and cancels stalled bodies', async () => {
  const oversized = request({ body: ' '.repeat(4097) })
  oversized.headers.set('content-length', '1')
  await assert.rejects(readRenderBody(oversized), RangeError)
  let cancelled = false
  const stream = new ReadableStream({ cancel() { cancelled = true } })
  const stalled = new Request('http://cms.test', { method: 'POST', body: stream, duplex: 'half' } as RequestInit)
  await assert.rejects(readRenderBody(stalled, 10), /timeout/)
  assert.ok(cancelled)
})

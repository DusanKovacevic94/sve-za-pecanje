import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  signPreview,
  verifyPreview,
  signature,
  verifyHook,
} from '../src/blog-signing'
import { deliverBlogEvent } from '../src/hooks/blog'

test('preview contract is identical across isolated application builds', async () => {
  assert.equal(
    await readFile(new URL('../src/blog-signing.ts', import.meta.url), 'utf8'),
    await readFile(
      new URL('../../frontend/src/lib/blog-signing.ts', import.meta.url),
      'utf8',
    ),
  )
})
test('signed handoffs are scoped, short-lived, tamper resistant and purpose separated', () => {
  process.env.CMS_PREVIEW_SECRET =
    'preview-test-only-00000000000000000000000000'
  const now = Date.now(),
    claims = {
      purpose: 'handoff' as const,
      post: '12',
      editor: '2',
      exp: Math.floor(now / 1000) + 60,
    }
  const token = signPreview(claims)
  assert.deepEqual(verifyPreview(token, 'handoff', now), claims)
  assert.equal(verifyPreview(token, 'session', now), null)
  assert.equal(verifyPreview(token, 'read', now), null)
  assert.equal(verifyPreview(token, 'handoff', now + 61_000), null)
  assert.equal(verifyPreview(`${token}x`, 'handoff', now), null)
  assert.equal(
    verifyPreview(
      signPreview({ ...claims, exp: claims.exp + 1 }),
      'handoff',
      now,
    ),
    null,
  )
  assert.equal(
    verifyPreview(
      signPreview({ ...claims, post: '//evil.test' }),
      'handoff',
      now,
    ),
    null,
  )
})
test('webhooks bind exact body and timestamp; retry succeeds or reconciles with sanitized warning', async () => {
  process.env.CMS_REVALIDATE_SECRET =
    'hook-test-only-00000000000000000000000000000'
  process.env.CMS_REVALIDATE_URL = 'http://127.0.0.1:1/api/blog/revalidate'
  const now = Date.now(),
    stamp = String(now),
    body = '{"test":1}',
    mac = signature(`${stamp}.${body}`, 'CMS_REVALIDATE_SECRET')
  assert.ok(verifyHook(body, stamp, mac, now))
  assert.equal(verifyHook(body + ' ', stamp, mac, now), false)
  assert.equal(verifyHook(body, stamp, mac, now + 61_000), false)
  let attempts = 0,
    warnings = 0
  const event = {
    version: 1 as const,
    collection: 'posts' as const,
    operation: 'change' as const,
    id: '1',
  }
  await deliverBlogEvent(
    event,
    () => warnings++,
    async (_url, init) => {
      attempts++
      const headers = new Headers(init?.headers)
      assert.ok(
        verifyHook(
          String(init?.body),
          headers.get('x-blog-timestamp')!,
          headers.get('x-blog-signature')!,
        ),
      )
      return new Response(null, { status: attempts < 3 ? 503 : 200 })
    },
  )
  assert.equal(attempts, 3)
  assert.equal(warnings, 0)
  attempts = 0
  await deliverBlogEvent(
    event,
    () => warnings++,
    async () => {
      attempts++
      throw new Error('DO_NOT_LOG_SECRET')
    },
  )
  assert.equal(attempts, 3)
  assert.equal(warnings, 1)
})

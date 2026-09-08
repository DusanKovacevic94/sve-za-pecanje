import assert from 'node:assert/strict'
import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { authorFixture, postFixture } from '../src/fixtures'
import { uploadMedia } from './media-upload'

export async function socialPreviewChecks(baseURL: string, cookie: string, snapshotStorage: () => Promise<unknown>) {
  const headers = { Cookie: cookie, Origin: baseURL, 'Content-Type': 'application/json' }
  const create = await fetch(`${baseURL}/api/posts?draft=true`, {
    method: 'POST', headers, body: JSON.stringify({ title: 'Private social fixture', slug: 'probni-social-render' }),
  })
  assert.equal(create.status, 201)
  const post = (await create.json()).doc
  const url = `${baseURL}/api/social-preview/${post.id}`
  const copy = { title: 'Probni naslov č ć ž š đ', description: 'Privatan opis za sliku.' }
  const render = (overrides = {}, body = JSON.stringify(copy)) => fetch(url, { method: 'POST', headers: { ...headers, ...overrides }, body })
  const beforeStorage = await snapshotStorage()
  try {
    assert.ok([401, 403].includes((await render({ Cookie: '' })).status))
    assert.ok([401, 403].includes((await render({ Origin: 'https://evil.example.test' })).status))
    // Payload may strip cookie authentication before our origin guard runs.
    assert.ok([401, 403].includes((await render({ Origin: '' })).status))
    assert.equal((await render({}, 'x'.repeat(4097))).status, 413)
    assert.equal((await render({}, JSON.stringify({ ...copy, extra: true }))).status, 422)
    const response = await render()
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.equal(response.headers.get('content-type'), 'image/jpeg')
    const bytes = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(bytes).metadata()
    assert.equal(metadata.width, 1080)
    assert.equal(metadata.height, 1350)
    const repeat = await render()
    assert.equal(repeat.status, 200)
    assert.deepEqual(Buffer.from(await repeat.arrayBuffer()), bytes)
    const saved = await (await fetch(`${baseURL}/api/posts/${post.id}?draft=true`, { headers })).json()
    assert.equal(saved.title, 'Private social fixture', 'unsaved render copy does not mutate the post')
    assert.equal(saved._status, 'draft')
    assert.equal(saved.socialTitle, null)
    assert.ok([403, 404].includes((await fetch(`${baseURL}/api/posts/${post.id}`)).status))
    for (let count = 0; count < 2; count++) assert.equal((await render()).status, 200)
    const limited = await render()
    assert.equal(limited.status, 429)
    assert.equal(limited.headers.get('retry-after'), '60')
    assert.deepEqual(await snapshotStorage(), beforeStorage, 'renders never add/change public or private objects')
    console.log('PASS: authenticated private social JPEG, CSRF/body/input/rate limits, deterministic bytes and unsaved copy without publication')
  } finally {
    assert.equal((await fetch(`${baseURL}/api/posts/${post.id}`, { method: 'DELETE', headers })).status, 200)
  }

  // Separate editor keeps the lifecycle checks independent of the rate-limit test.
  const api = async (path: string, method = 'GET', data?: object) => {
    const response = await fetch(`${baseURL}/api${path}`, { method, headers, ...(data ? { body: JSON.stringify(data) } : {}) })
    assert.ok(response.ok, `${method} ${path}: ${response.status}`)
    return response.json()
  }
  const password = randomBytes(24).toString('hex')
  const user = (await api('/users', 'POST', { email: 'social-release@example.test', role: 'editor', password })).doc
  const login = await fetch(`${baseURL}/api/users/login`, { method: 'POST', headers, body: JSON.stringify({ email: user.email, password }) })
  assert.equal(login.status, 200)
  const editorCookie = login.headers.get('set-cookie')!.split(';')[0]
  const author = (await api('/authors', 'POST', authorFixture)).doc
  const media = await uploadMedia(baseURL, cookie)
  const lifecycle = (await api('/posts?draft=true', 'POST', { ...postFixture, slug: 'probni-social-lifecycle', author: author.id, coverImage: media.id })).doc
  const lifecycleURL = `${baseURL}/api/social-preview/${lifecycle.id}`
  const storage = await snapshotStorage()
  try {
    for (const state of ['draft', 'published', 'draft'] as const) {
      if (state !== 'draft' || (await api(`/posts/${lifecycle.id}`))._status === 'published') {
        await api(`/posts/${lifecycle.id}`, 'PATCH', { _status: state })
      }
      const savedBefore = await api(`/posts/${lifecycle.id}?draft=true`)
      const versionsBefore = await api(`/posts/versions?where[parent][equals]=${lifecycle.id}`)
      const denied = await fetch(lifecycleURL, { method: 'POST', headers: { Origin: baseURL, 'Content-Type': 'application/json' }, body: JSON.stringify(copy) })
      assert.equal(denied.status, 401)
      assert.equal(denied.headers.get('cache-control'), 'private, no-store')
      assert.notEqual((await fetch(lifecycleURL)).status, 200, 'no public GET image route')
      const response = await fetch(lifecycleURL, { method: 'POST', headers: { ...headers, Cookie: editorCookie }, body: JSON.stringify(copy) })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('cache-control'), 'private, no-store')
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
      await response.arrayBuffer()
      assert.deepEqual(await api(`/posts/${lifecycle.id}?draft=true`), savedBefore)
      assert.deepEqual(await api(`/posts/versions?where[parent][equals]=${lifecycle.id}`), versionsBefore, 'render adds no versions')
      assert.deepEqual(await snapshotStorage(), storage)
    }
    await api(`/users/${user.id}`, 'DELETE')
    const revoked = await fetch(lifecycleURL, { method: 'POST', headers: { ...headers, Cookie: editorCookie }, body: JSON.stringify(copy) })
    assert.equal(revoked.status, 401, 'deleted editor session cannot render')
    console.log('PASS: social render privacy across draft/published/withdrawn states, session revocation, unchanged posts/versions and all storage buckets')
  } finally {
    await api(`/posts/${lifecycle.id}`, 'DELETE')
    await api(`/media/${media.id}`, 'DELETE')
    await api(`/authors/${author.id}`, 'DELETE')
    // The owned database is discarded by the outer harness even on failure.
  }
}

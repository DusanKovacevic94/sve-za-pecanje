import assert from 'node:assert/strict'
import sharp from 'sharp'

export async function socialPreviewChecks(baseURL: string, cookie: string) {
  const headers = { Cookie: cookie, Origin: baseURL, 'Content-Type': 'application/json' }
  const create = await fetch(`${baseURL}/api/posts?draft=true`, {
    method: 'POST', headers, body: JSON.stringify({ title: 'Private social fixture', slug: 'probni-social-render' }),
  })
  assert.equal(create.status, 201)
  const post = (await create.json()).doc
  const url = `${baseURL}/api/social-preview/${post.id}`
  const copy = { title: 'Probni naslov č ć ž š đ', description: 'Privatan opis za sliku.' }
  const render = (overrides = {}, body = JSON.stringify(copy)) => fetch(url, { method: 'POST', headers: { ...headers, ...overrides }, body })
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
    console.log('PASS: authenticated private social JPEG, CSRF/body/input/rate limits, deterministic bytes and unsaved copy without publication')
  } finally {
    assert.equal((await fetch(`${baseURL}/api/posts/${post.id}`, { method: 'DELETE', headers })).status, 200)
  }
}

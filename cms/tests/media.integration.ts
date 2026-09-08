import assert from 'node:assert/strict'
import sharp from 'sharp'
import { authorFixture, fixtureImage, mediaFixture, paragraph, postFixture } from '../src/fixtures'
import { MAX_IMAGE_BYTES } from '../src/media-images'
import { uploadMedia } from './media-upload'

export async function mediaChecks(baseURL: string, cookie: string, restart: () => Promise<void>) {
  const api = (path: string, method = 'GET', data?: object, authenticated = true) => fetch(`${baseURL}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', Origin: baseURL, ...(authenticated ? { Cookie: cookie } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  })
  const ok = async (path: string, method = 'GET', data?: object) => {
    const response = await api(path, method, data)
    const result = await response.json()
    assert.ok(response.ok, `${path}: ${JSON.stringify(result)}`)
    return result.doc || result
  }
  const metadata = { ...mediaFixture, internalNotes: 'PRIVATE_MEDIA_NOTE' }
  const orphan = await uploadMedia(baseURL, cookie, metadata)
  assert.match(orphan.filename, /^[0-9a-f-]{36}\.webp$/)
  assert.equal(orphan.prefix, 'media')
  for (const key of ['thumbnail', 'coverMobile', 'coverDesktop', 'inline']) assert.ok(orphan.sizes[key].url, `${key} variant`)
  assert.equal(orphan.sizes.coverMobile.width, 640)
  assert.equal(orphan.sizes.coverDesktop.width, 1280)
  assert.ok([403, 404].includes((await api(`/media/${orphan.id}?depth=10`, 'GET', undefined, false)).status), 'unpublished metadata is private')
  for (const image of [orphan, ...Object.values(orphan.sizes)] as { url: string; width: number; height: number }[]) {
    const response = await fetch(image.url)
    assert.equal(response.status, 200, 'files are public even before publication')
    const decoded = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
    assert.equal(decoded.width, image.width)
    assert.equal(decoded.height, image.height)
    assert.equal(decoded.exif, undefined)
    assert.equal(decoded.format, 'webp')
  }
  // Server-owned keys cannot be forged through metadata updates.
  const updated = await ok(`/media/${orphan.id}`, 'PATCH', { filename: 'somebody-else.webp', prefix: '../listings', url: 'http://127.0.0.1/private', alt: orphan.alt })
  assert.equal(updated.filename, orphan.filename)
  assert.equal(updated.prefix, 'media')
  const file = await fixtureImage()
  const replace = new FormData()
  replace.set('_payload', JSON.stringify(metadata))
  replace.set('file', new Blob([new Uint8Array(file.data)], { type: file.mimetype }), file.name)
  assert.equal((await fetch(`${baseURL}/api/media/${orphan.id}`, { method: 'PATCH', headers: { Cookie: cookie, Origin: baseURL }, body: replace })).status, 400)
  assert.equal((await api('/media', 'POST', { ...metadata, url: 'http://127.0.0.1/private' })).status, 400)
  for (const data of [Buffer.from('<script>bad image</script>'), Buffer.alloc(MAX_IMAGE_BYTES + 1)]) {
    const form = new FormData()
    form.set('_payload', JSON.stringify(metadata))
    form.set('file', new Blob([data], { type: 'image/png' }), 'bad.png')
    const response = await fetch(`${baseURL}/api/media`, { method: 'POST', headers: { Cookie: cookie, Origin: baseURL }, body: form })
    assert.ok([400, 413].includes(response.status), `invalid upload: ${response.status}`)
  }
  const cover = await uploadMedia(baseURL, cookie)
  const inline = await uploadMedia(baseURL, cookie)
  const author = await ok('/authors', 'POST', authorFixture)
  const body = { root: { ...postFixture.body.root, children: [...postFixture.body.root.children,
    { type: 'block', version: 2, format: '', fields: { blockType: 'image', image: inline.id, caption: 'Opis u tekstu.' } },
  ] } }
  const post = await ok('/posts?draft=true', 'POST', { ...postFixture, slug: 'media-test', author: author.id, coverImage: cover.id, body })
  for (const image of [cover, inline]) assert.equal((await api(`/media/${image.id}`, 'DELETE')).status, 409, 'draft references block deletion')
  await ok(`/posts/${post.id}`, 'PATCH', { _status: 'published' })
  const publicInline = await (await api(`/media/${inline.id}`, 'GET', undefined, false)).json()
  assert.equal(publicInline.alt, mediaFixture.alt)
  assert.equal(publicInline.caption, mediaFixture.caption)
  assert.equal(publicInline.credit, mediaFixture.credit)
  assert.equal(publicInline.filename, undefined)
  assert.equal(publicInline.prefix, undefined)
  assert.equal(publicInline.internalNotes, undefined)
  // Remove the inline reference from the live article, retaining it only in history.
  await ok(`/posts/${post.id}`, 'PATCH', { body: paragraph('Dopunjen tekst bez slike.'), _status: 'published' })
  assert.ok([403, 404].includes((await api(`/media/${inline.id}`, 'GET', undefined, false)).status))
  assert.equal((await api(`/media/${inline.id}`, 'DELETE')).status, 409, 'retained version blocks deletion')
  await restart()
  assert.equal((await fetch(cover.sizes.coverDesktop.url)).status, 200)
  assert.equal((await ok(`/media/${cover.id}`)).url, cover.url)
  assert.equal((await api(`/media/${cover.id}`, 'DELETE')).status, 409)
  const versions = (await ok(`/posts/versions?where[parent][equals]=${post.id}&limit=50`)).docs
  const withImage = versions.find((version: { version: { body: unknown } }) => JSON.stringify(version.version.body).includes('Opis u tekstu.'))
  assert.ok(withImage)
  await ok(`/posts/versions/${withImage.id}?draft=true`, 'POST')
  assert.equal((await fetch(inline.url)).status, 200, 'version recovery keeps the image')
  // Recovery can restore a published version. Remove this owned article so the
  // subsequent blog harness starts empty; keep its images for the render check.
  await ok(`/posts/${post.id}`, 'DELETE')
  const racing = await uploadMedia(baseURL, cookie)
  const [save, remove] = await Promise.all([
    api('/posts?draft=true', 'POST', { title: 'Concurrent reference test', slug: 'concurrent-image-reference', coverImage: racing.id }),
    api(`/media/${racing.id}`, 'DELETE'),
  ])
  assert.ok((save.status === 201 && remove.status === 409) || (save.status === 400 && remove.status === 200), `save/delete race: ${save.status}/${remove.status}`)
  // The object URL survives a CMS restart but disappears when an orphan is deleted.
  await ok(`/media/${orphan.id}`, 'DELETE')
  for (const image of [orphan, ...Object.values(orphan.sizes)] as { url: string }[]) assert.equal((await fetch(image.url)).status, 404)
  console.log('PASS: MinIO upload/variants/URLs, private metadata, validation, immutable keys, safe deletion, restart and version recovery')
  return { mobile: cover.sizes.coverMobile.url as string, desktop: cover.sizes.coverDesktop.url as string }
}

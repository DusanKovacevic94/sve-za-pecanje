import assert from 'node:assert/strict'
import { fixtureImage, mediaFixture } from '../src/fixtures'

export async function uploadMedia(baseURL: string, cookie: string, metadata: object = mediaFixture, file?: Awaited<ReturnType<typeof fixtureImage>>) {
  const input = file || await fixtureImage()
  const form = new FormData()
  form.set('_payload', JSON.stringify(metadata))
  form.set('file', new Blob([new Uint8Array(input.data)], { type: input.mimetype }), input.name)
  const response = await fetch(`${baseURL}/api/media`, { method: 'POST', headers: { Cookie: cookie, Origin: baseURL }, body: form })
  const result = await response.json()
  assert.equal(response.status, 201, JSON.stringify(result))
  return result.doc
}

import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { sanitizeImage, MAX_IMAGE_BYTES } from '../src/media-images'
import { mediaURL, storageEnvironment } from '../src/storage'

test('storage settings require separate credentials and support path/virtual-hosted providers', () => {
  const env = { CMS_ENV: 'production', CMS_S3_ENDPOINT: 'https://fsn1.your-objectstorage.com', CMS_S3_PUBLIC_URL: 'https://cms-bucket.fsn1.your-objectstorage.com', CMS_S3_BUCKET: 'cms-bucket', CMS_S3_ACCESS_KEY_ID: 'cms-key', CMS_S3_SECRET_ACCESS_KEY: 'test-secret-only-32-characters-long', CMS_S3_FORCE_PATH_STYLE: 'false' }
  assert.equal(storageEnvironment(env).config.forcePathStyle, false)
  assert.throws(() => storageEnvironment({}), /credentials|CMS_S3_ACCESS_KEY_ID/)
  assert.throws(() => storageEnvironment({ ...env, CMS_S3_BUCKET: 'fishing-marketplace' }), /dedicated/)
  assert.equal(storageEnvironment({ ...env, CMS_S3_BUCKET: 'fishing-marketplace', CMS_ALLOW_SHARED_STORAGE: 'true' }).bucket, 'fishing-marketplace')
  assert.throws(() => storageEnvironment({ ...env, CMS_S3_BUCKET: '../listings', CMS_ALLOW_SHARED_STORAGE: 'true' }), /valid CMS bucket/)
  assert.throws(() => storageEnvironment({ ...env, CMS_S3_PUBLIC_URL: 'http://example.test' }), /HTTPS/)
  assert.equal(new URL(String(storageEnvironment({ CMS_BUILD: 'true' }).config.endpoint)).port, '1')
  assert.equal(mediaURL('https://images.example.test', 'abc-640x360.webp'), 'https://images.example.test/media/abc-640x360.webp')
  assert.throws(() => mediaURL('https://images.example.test', '../listings/secret.webp'))
})

test('image processing validates bytes and dimensions and strips metadata', async () => {
  const input = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#245344' } }).jpeg().withExif({ IFD0: { Artist: 'Private photographer' } }).toBuffer()
  assert.ok((await sharp(input).metadata()).exif)
  const result = await sanitizeImage({ data: input, size: input.length, name: '../../private-name.jpg', mimetype: 'image/jpeg' })
  assert.match(result.name, /^[0-9a-f-]{36}\.webp$/)
  const metadata = await sharp(result.data).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 1600)
  assert.equal(metadata.exif, undefined)
  assert.equal(metadata.icc, undefined)
  const invalid = [
    { data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), mimetype: 'image/svg+xml' },
    { data: input, mimetype: 'image/png' },
    { data: input.subarray(0, 100), mimetype: 'image/jpeg' },
    { data: await sharp({ create: { width: 100, height: 100, channels: 3, background: '#000' } }).png().toBuffer(), mimetype: 'image/png' },
    { data: await sharp({ create: { width: 10001, height: 180, channels: 3, background: '#000' } }).png().toBuffer(), mimetype: 'image/png' },
  ]
  for (const file of invalid) await assert.rejects(sanitizeImage({ ...file, size: file.data.length, name: 'invalid.png' }), /valid, non-animated/)
  await assert.rejects(sanitizeImage({ data: input, size: MAX_IMAGE_BYTES + 1, name: 'large.jpg', mimetype: 'image/jpeg' }), /10 MB/)
})

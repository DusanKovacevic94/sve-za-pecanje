import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, cp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { SocialCardError, validateSocialCardInput } from '../src/social-card/contract'
import { composeSocialCard, loadSocialAssets } from '../src/social-card/core'
import { renderSocialCard } from '../src/social-card'
import { createSocialCardRunner } from '../src/social-card/runner'

const input = { title: 'Kako izabrati prvu mašinicu?', description: 'Veličina, prenos i kočnica: šta je važno pri izboru opreme za tvoj način ribolova.' }
const assets = path.resolve('assets/social')
const hasCode = (code: string) => (error: unknown) => error instanceof SocialCardError && error.code === code

test('social input is exact, bounded, plain text and normalized before code-point limits', () => {
  assert.deepEqual(validateSocialCardInput({ title: ' c\u030c \n ć ', description: ' kratak\u00a0opis ' }), { title: 'č ć', description: 'kratak opis' })
  for (const value of [null, [], {}, { ...input, svg: '<svg/>' }, { ...input, font: '/etc/passwd' }, { ...input, imageURL: 'https://example.test/image' },
    { ...input, title: 1 }, { ...input, title: '' }, { ...input, title: 'a'.repeat(1001) }, { ...input, get title() { throw Error('must not execute getter') } }]) {
    assert.throws(() => validateSocialCardInput(value), hasCode('invalid_input'))
  }
  for (const title of ['hi\0', 'hi\u202e', 'hi\u00ad', 'hi\u200b', 'hi\u034f', 'hi\ufe0f', '\ud800', 'hi\u000b']) {
    assert.throws(() => validateSocialCardInput({ ...input, title }), hasCode('unsupported_glyph'))
  }
  assert.throws(() => validateSocialCardInput({ ...input, title: 'i'.repeat(101) }), hasCode('overflow'))
  assert.throws(() => validateSocialCardInput({ ...input, description: 'i'.repeat(181) }), hasCode('overflow'))
})

test('font-aware wrapping preserves approved lines, fixed sizing, literal XML, and glyph coverage', async () => {
  const loaded = await loadSocialAssets(assets)
  const result = composeSocialCard(input, loaded)
  assert.deepEqual(result.lines, {
    title: ['Kako izabrati prvu', 'mašinicu?'],
    description: ['Veličina, prenos i kočnica: šta je važno pri izboru', 'opreme za tvoj način ribolova.'],
  })
  assert.match(result.svg, /font-size="76"/)
  assert.match(result.svg, /data:font\/ttf;base64/)
  assert.ok(!result.rasterSVG.includes('<text ') && !result.rasterSVG.includes('<style>'))
  const literal = composeSocialCard({ title: '<script> & "č"', description: '<svg onload="x"> đ ć ž š </svg>' }, loaded)
  assert.match(literal.svg, /&lt;script&gt; &amp; &quot;č&quot;/)
  assert.ok(!literal.svg.includes('<script>') && !literal.svg.includes('<svg onload'))
  assert.throws(() => composeSocialCard({ ...input, title: '魚 🎣' }, loaded), hasCode('unsupported_glyph'))
  assert.throws(() => composeSocialCard({ ...input, title: 'W'.repeat(40) }, loaded), hasCode('overflow'))
  assert.throws(() => composeSocialCard({ ...input, title: 'WIDE '.repeat(20).trim() }, loaded), hasCode('overflow'))
  const boundary = composeSocialCard({ title: 'Izbor niti i sitni pribor. '.repeat(5).slice(0, 99) + '.', description: 'Sitni pribor i niti za ribolov. '.repeat(6).slice(0, 180).padEnd(180, '.') }, loaded)
  assert.equal(boundary.lines.title.length, 4)
  assert.ok(boundary.lines.description.length <= 4)
  assert.equal(composeSocialCard({ ...input, title: 'c\u030c' }, loaded).svg, composeSocialCard({ ...input, title: 'č' }, loaded).svg)
})

test('missing, oversized or changed deployment assets fail closed without exposing paths', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'szp-social-assets-'))
  try {
    await assert.rejects(loadSocialAssets(temporary), hasCode('unavailable'))
    await cp(assets, temporary, { recursive: true })
    await writeFile(path.join(temporary, 'blog-card.svg'), '<svg><image href="http://example.test/private"/></svg>')
    await assert.rejects(loadSocialAssets(temporary), hasCode('unavailable'))
    await cp(assets, temporary, { recursive: true })
    await writeFile(path.join(temporary, 'Manrope-variable.ttf'), Buffer.alloc(1_000_001))
    await assert.rejects(loadSocialAssets(temporary), hasCode('unavailable'))
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test('isolated public renderer returns deterministic opaque JPEGs and keeps failures recoverable', async () => {
  const first = await renderSocialCard(input)
  assert.deepEqual(first, await renderSocialCard(input))
  const metadata = await sharp(first.jpeg).metadata()
  assert.equal(metadata.format, 'jpeg')
  assert.equal(metadata.width, 1080)
  assert.equal(metadata.height, 1350)
  assert.equal(metadata.channels, 3)
  assert.equal(metadata.exif, undefined)
  assert.equal(metadata.xmp, undefined)
  assert.ok(first.jpeg.length < 1_000_000)
  const pixel = await sharp(first.jpeg).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()
  assert.ok(Math.abs(pixel[0] - 23) <= 2 && Math.abs(pixel[1] - 63) <= 2 && Math.abs(pixel[2] - 55) <= 2)
  await assert.rejects(renderSocialCard({ ...input, title: '🎣' }), hasCode('unsupported_glyph'))
  assert.equal((await renderSocialCard(input)).templateVersion, 1)
})

test('worker limits reject saturation and reclaim capacity after timeout, abort, crash and missing worker', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'szp-social-worker-'))
  try {
    const worker = path.join(temporary, 'worker.cjs')
    await writeFile(worker, 'process.on("message", () => { setInterval(() => {}, 1000) })')
    const run = createSocialCardRunner(worker, temporary, 400, 1)
    const pending = assert.rejects(run(input), hasCode('timeout'))
    await assert.rejects(run(input), hasCode('busy'))
    await pending
    const aborter = new AbortController()
    const aborted = assert.rejects(run(input, { signal: aborter.signal }), hasCode('cancelled'))
    aborter.abort()
    await aborted
    await assert.rejects(run(input, { signal: aborter.signal }), hasCode('cancelled'))
    await writeFile(worker, 'process.on("message", () => process.exit(2))')
    await assert.rejects(run(input), hasCode('unavailable'))
    await assert.rejects(createSocialCardRunner(path.join(temporary, 'missing.cjs'), temporary)(input), hasCode('unavailable'))
    await assert.rejects(createSocialCardRunner(worker, path.join(temporary, 'missing-directory'))(input), hasCode('unavailable'))
    await writeFile(worker, 'process.on("message", () => process.send({ok:true,result:{}}, () => process.exit(0)))')
    await assert.rejects(run(input), hasCode('unavailable'))
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

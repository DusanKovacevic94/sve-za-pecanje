import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { requireLocalMaintenance } from '../src/environment'
import { authorFixture, fixtureImage, mediaFixture, postFixture } from '../src/fixtures'

if (existsSync('.env')) loadEnvFile('.env')
process.env.DISABLE_PAYLOAD_HMR = 'true'
async function seed() {
  requireLocalMaintenance()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const existing = await payload.find({ collection: 'posts', draft: true, where: { slug: { equals: postFixture.slug } }, limit: 1 })
    if (existing.totalDocs) { console.log('Local fixture already exists; nothing changed.'); return }
    const author = await payload.create({ collection: 'authors', data: { ...authorFixture, isPublic: false } })
    const media = await payload.create({ collection: 'media', data: { ...mediaFixture, isPublic: false }, file: await fixtureImage() })
    await payload.create({ collection: 'posts', draft: true, data: { ...postFixture, author: author.id, coverImage: media.id, _status: 'draft' } })
    console.log('Created a synthetic article draft and private metadata. Its image file is publicly addressable.')
  } finally { await payload.destroy() }
}
seed().then(() => process.exit(0)).catch(() => { console.error('Local CMS fixture creation failed. Check configuration and migrations.'); process.exit(1) })

import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import pg from 'pg'
import { databaseURL, requireLocalMaintenance } from '../src/environment'

if (existsSync('.env')) loadEnvFile('.env')
// A one-shot CLI must not open Payload's development hot-reload WebSocket.
process.env.DISABLE_PAYLOAD_HMR = 'true'

async function bootstrap() {
  requireLocalMaintenance()
  const email = process.env.CMS_BOOTSTRAP_EMAIL
  const password = process.env.CMS_BOOTSTRAP_PASSWORD
  if (!email || !password || password.length < 16) {
    throw new Error('Set CMS_BOOTSTRAP_EMAIL and CMS_BOOTSTRAP_PASSWORD (at least 16 characters).')
  }
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const lock = new pg.Client({ connectionString: databaseURL(), connectionTimeoutMillis: 5000 })
  try {
    await lock.connect()
    await lock.query("SELECT pg_advisory_lock(hashtext('szp-cms-bootstrap'))")
    const existing = await payload.count({ collection: 'users', overrideAccess: true })
    if (existing.totalDocs !== 0) throw new Error('Bootstrap refused: a CMS account already exists.')
    await payload.create({ collection: 'users', data: { email, password }, context: { bootstrapAdmin: true }, overrideAccess: true })
    console.log('Initial CMS administrator created. Bootstrap credentials can now be removed.')
  } finally {
    await lock.end()
    await payload.destroy()
  }
}

// Payload 3.88 retains a checked-out reconnect client even after destroy(). As in
// Payload's own migration CLI, exit explicitly after all application work completes.
bootstrap().then(() => process.exit(0)).catch((error: Error) => {
  console.error(error.message.startsWith('Set CMS_') || error.message.startsWith('Bootstrap refused:')
    ? error.message : 'CMS bootstrap failed. Check local configuration and apply migrations first.')
  process.exit(1)
})

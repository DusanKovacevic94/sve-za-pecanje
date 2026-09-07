import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:net'
import pg from 'pg'
import { databaseURL } from '../src/environment'
import { provision } from '../scripts/provision'
import { editorialChecks } from './editorial'
import { prepareStorage } from './storage-harness'
import { mediaChecks } from './media.integration'
import { createBlogHarness } from './blog.integration'
import { productionChecks } from './production.integration'

// Every database/container is synthetic and owned by this run. No external DB URL
// is accepted, and cleanup uses only IDs returned by our successful Docker calls.
async function command(file: string, args: string[], env = process.env) {
  const child = spawn(file, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', data => { output += data })
  child.stderr.on('data', data => { output += data })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(`${file} ${args.join(' ')} failed:\n${output}`)
  return output.trim()
}

async function waitUntil(check: () => Promise<boolean>, label: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if (await check()) return } catch { /* service is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function availablePort() {
  const socket = createServer()
  socket.listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const address = socket.address()
  assert.ok(address && typeof address !== 'string')
  const port = address.port
  socket.close()
  await once(socket, 'close')
  return port
}

const runID = `szp-cms-test-${randomUUID()}`
const password = randomBytes(24).toString('hex')
const originalEnv = { ...process.env }
let databaseContainer = ''
let imageContainer = ''
let mailContainer = ''
let minioContainer = ''
let network = ''
let server: ChildProcess | undefined
let serverLog = ''
let blogHarness: Awaited<ReturnType<typeof createBlogHarness>> | undefined
const clients: pg.Client[] = []

try {
  network = await command('docker', ['network', 'create', runID])
  databaseContainer = await command('docker', [
    'run', '--detach', '--rm', '--name', `${runID}-db`, '--network', network,
    '--network-alias', 'postgres', '--publish', '127.0.0.1::5432',
    '--env', 'POSTGRES_PASSWORD', 'postgres:16-alpine',
  ], { ...process.env, POSTGRES_PASSWORD: password })
  const mapping = await command('docker', ['port', databaseContainer, '5432/tcp'])
  const port = mapping.split(':').at(-1)!
  Object.assign(process.env, {
    CMS_ENV: 'test', CMS_DATABASE_HOST: '127.0.0.1', CMS_DATABASE_PORT: port,
    CMS_DATABASE_PASSWORD: randomBytes(24).toString('hex'),
    CMS_SECRET: randomBytes(32).toString('hex'),
    CMS_PROVISION_USER: 'postgres', CMS_PROVISION_PASSWORD: password,
    CMS_BOOTSTRAP_EMAIL: 'editor@example.test',
    CMS_BOOTSTRAP_PASSWORD: randomBytes(24).toString('hex'),
    CMS_PREVIEW_SECRET: randomBytes(32).toString('hex'),
    CMS_REVALIDATE_SECRET: randomBytes(32).toString('hex'),
    CMS_REVALIDATE_URL: '',
  })
  delete process.env.CMS_BUILD
  const storagePassword = randomBytes(24).toString('hex')
  minioContainer = await command('docker', ['run', '--detach', '--rm', '--network', network,
    '--network-alias', 'minio', '--publish', '127.0.0.1::9000', '--env', 'MINIO_ROOT_USER', '--env', 'MINIO_ROOT_PASSWORD',
    'minio/minio:latest', 'server', '/data'], { ...process.env, MINIO_ROOT_USER: 'minioadmin', MINIO_ROOT_PASSWORD: storagePassword })
  await prepareStorage(command, network, minioContainer, storagePassword)
  // Capture recovery mail in an isolated local SMTP inbox; no external delivery.
  mailContainer = await command('docker', ['run', '--detach', '--rm', '--network', network,
    '--network-alias', 'mailpit', '--publish', '127.0.0.1::1025', '--publish', '127.0.0.1::8025', 'axllent/mailpit:v1.27'])
  process.env.CMS_SMTP_HOST = '127.0.0.1'
  process.env.CMS_SMTP_PORT = (await command('docker', ['port', mailContainer, '1025/tcp'])).split(':').at(-1)!
  const mailURL = `http://${await command('docker', ['port', mailContainer, '8025/tcp'])}`
  const adminURL = new URL(`postgresql://postgres@127.0.0.1:${port}/postgres`)
  adminURL.password = password
  // pg_isready inside the container can see initdb's temporary Unix-socket server
  // before the final TCP listener is ready. Probe the exact connection we will use.
  await waitUntil(async () => {
    const probe = new pg.Client({ connectionString: adminURL.toString(), connectionTimeoutMillis: 1000 })
    try {
      await probe.connect()
      await probe.query('SELECT 1')
      return true
    } finally { await probe.end() }
  }, 'PostgreSQL TCP listener')
  const admin = new pg.Client({ connectionString: adminURL.toString() })
  clients.push(admin)
  await admin.connect()
  await admin.query('CREATE DATABASE fishing_marketplace')
  await admin.end()
  adminURL.pathname = '/fishing_marketplace'
  const marketplace = new pg.Client({ connectionString: adminURL.toString() })
  clients.push(marketplace)
  await marketplace.connect()
  await marketplace.query('CREATE TABLE marketplace_sentinel (id integer PRIMARY KEY, value text NOT NULL)')
  await marketplace.query("INSERT INTO marketplace_sentinel VALUES (1, 'preserve-existing-data')")
  const before = await command('docker', ['exec', databaseContainer, 'pg_dump', '-U', 'postgres', '--schema-only', '--no-owner', 'fishing_marketplace'])
  await provision()
  await provision()
  console.log('PASS: repeatable provisioning alongside an existing marketplace database')

  const cms = new pg.Client({ connectionString: databaseURL() })
  clients.push(cms)
  await cms.connect()
  for (const query of ['CREATE DATABASE must_not_exist', 'CREATE ROLE must_not_exist', 'CREATE SCHEMA must_not_exist']) {
    await assert.rejects(cms.query(query), (error: unknown) => (error as { code: string }).code === '42501')
  }
  const blockedURL = new URL(databaseURL())
  blockedURL.pathname = '/fishing_marketplace'
  const blocked = new pg.Client({ connectionString: blockedURL.toString() })
  clients.push(blocked)
  await blocked.connect()
  for (const query of ['SELECT * FROM marketplace_sentinel', "INSERT INTO marketplace_sentinel VALUES (2, 'forbidden')", 'ALTER TABLE marketplace_sentinel ADD COLUMN forbidden text']) {
    await assert.rejects(blocked.query(query), (error: unknown) => (error as { code: string }).code === '42501')
  }
  await blocked.end()
  console.log('PASS: CMS role cannot read/write marketplace data or create roles/databases/schemas')

  await command('pnpm', ['migrate'])
  const migrationCount = await cms.query('SELECT count(*)::integer AS count FROM payload_migrations')
  assert.ok(migrationCount.rows[0].count > 0)
  await command('pnpm', ['migrate'])
  assert.deepEqual((await cms.query('SELECT count(*)::integer AS count FROM payload_migrations')).rows, migrationCount.rows)
  // Emulate a foundation deployment followed by the editorial deployment. Payload
  // rolls back a whole batch, not a single file; this synthetic ledger splits them.
  await cms.query("UPDATE payload_migrations SET batch = 2 WHERE name <> '20260907_091809_initial'")
  await command('pnpm', ['exec', 'payload', 'migrate:down'])
  assert.equal((await cms.query("SELECT to_regclass('public.posts') AS posts")).rows[0].posts, null)
  await cms.query("INSERT INTO users (email) VALUES ('legacy-admin@example.test')")
  await command('pnpm', ['migrate'])
  assert.equal((await cms.query("SELECT role FROM users WHERE email = 'legacy-admin@example.test'")).rows[0].role, 'admin')
  await cms.query("DELETE FROM users WHERE email = 'legacy-admin@example.test'")
  await command('pnpm', ['exec', 'payload', 'migrate:down'])
  await command('pnpm', ['exec', 'payload', 'migrate:down'])
  assert.equal((await cms.query("SELECT to_regclass('public.users') AS users")).rows[0].users, null)
  await command('pnpm', ['migrate'])
  assert.deepEqual((await cms.query('SELECT count(*)::integer AS count FROM payload_migrations')).rows, migrationCount.rows)
  console.log('PASS: explicit migrations, repeated upgrades, and downgrade/re-upgrade')

  const httpPort = await availablePort()
  const baseURL = `http://127.0.0.1:${httpPort}`
  process.env.CMS_PUBLIC_URL = baseURL
  // Cross-application tests run against the production-mode standalone CMS on
  // loopback. The image variant retains its isolated Docker-network media/API
  // checks and does not expose host test relays outside loopback.
  if (!process.env.CMS_TEST_IMAGE && process.env.CMS_TEST_SCOPE !== 'production') blogHarness = await createBlogHarness(baseURL)
  if (process.env.CMS_TEST_IMAGE) {
    const imageEnv = { ...process.env, CMS_DATABASE_HOST: 'postgres', CMS_DATABASE_PORT: '5432', CMS_SMTP_HOST: 'mailpit', CMS_SMTP_PORT: '1025', CMS_S3_ENDPOINT: 'http://minio:9000' }
    imageContainer = await command('docker', [
      'run', '--detach', '--rm', '--network', network,
      '--publish', `127.0.0.1:${httpPort}:3002`,
      ...['CMS_ENV', 'CMS_DATABASE_HOST', 'CMS_DATABASE_PORT', 'CMS_DATABASE_PASSWORD', 'CMS_SECRET', 'CMS_PUBLIC_URL', 'CMS_SMTP_HOST', 'CMS_SMTP_PORT', 'CMS_S3_ENDPOINT', 'CMS_S3_PUBLIC_URL', 'CMS_S3_REGION', 'CMS_S3_BUCKET', 'CMS_S3_FORCE_PATH_STYLE', 'CMS_S3_ACCESS_KEY_ID', 'CMS_S3_SECRET_ACCESS_KEY'].flatMap(key => ['--env', key]),
      process.env.CMS_TEST_IMAGE,
    ], imageEnv)
    assert.notEqual(await command('docker', ['exec', imageContainer, 'id', '-u']), '0')
  } else {
    server = spawn(process.execPath, ['.next/standalone/server.js'], {
      env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(httpPort) }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout!.on('data', data => { serverLog += data })
    server.stderr!.on('data', data => { serverLog += data })
  }
  await waitUntil(async () => (await fetch(`${baseURL}/health/ready`)).ok, 'CMS readiness')
  const post = (path: string, data: object) => fetch(`${baseURL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: baseURL }, body: JSON.stringify(data),
  })
  const data = { email: 'attacker@example.test', password: randomBytes(24).toString('hex'), context: { bootstrapAdmin: true } }
  assert.equal((await post('/api/users/first-register', data)).status, 403)
  assert.equal((await post('/api/users', data)).status, 403)
  assert.equal((await cms.query('SELECT count(*)::integer AS count FROM users')).rows[0].count, 0)
  assert.equal((await fetch(`${baseURL}/admin/create-first-user`)).status, 404)
  await command('pnpm', ['bootstrap'])
  await assert.rejects(command('pnpm', ['bootstrap']), /Bootstrap refused/)
  const login = await post('/api/users/login', { email: process.env.CMS_BOOTSTRAP_EMAIL, password: process.env.CMS_BOOTSTRAP_PASSWORD })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie') || ''
  assert.match(cookie, /szp-cms-token=/)
  assert.match(cookie, /HttpOnly/i)
  assert.doesNotMatch(cookie, /Domain=/i)
  const adminPage = await fetch(`${baseURL}/admin`, { headers: { Cookie: cookie.split(';')[0] } })
  assert.equal(adminPage.status, 200)
  const html = await adminPage.text()
  assert.ok(html.includes('Sve Za Pecanje CMS'))
  const asset = html.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/)
  assert.ok(asset, 'admin HTML references a compiled asset')
  assert.equal((await fetch(new URL(asset[1].replaceAll('&amp;', '&'), baseURL))).status, 200)
  assert.match(adminPage.headers.get('x-robots-tag') || '', /noindex/)
  console.log('PASS: public bootstrap denied, explicit bootstrap works once, admin login and compiled assets work')
  await command('pnpm', ['seed'])
  await command('pnpm', ['seed'])
  assert.equal((await cms.query('SELECT count(*)::integer AS count FROM posts')).rows[0].count, 1)
  assert.equal((await (await fetch(`${baseURL}/api/posts?draft=true`)).json()).totalDocs, 0)
  if (process.env.CMS_TEST_SCOPE === 'production') {
    for (const collection of ['authors', 'media']) {
      const fixture = (await cms.query(`SELECT id FROM ${collection} LIMIT 1`)).rows[0].id
      assert.equal((await fetch(`${baseURL}/api/${collection}/${fixture}`, {
        method: 'PATCH', headers: { Cookie: cookie.split(';')[0], Origin: baseURL, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: true }),
      })).status, 200)
    }
    const fixtureID = (await cms.query('SELECT id FROM posts LIMIT 1')).rows[0].id
    assert.equal((await fetch(`${baseURL}/api/posts/${fixtureID}`, {
      method: 'PATCH', headers: { Cookie: cookie.split(';')[0], Origin: baseURL, 'Content-Type': 'application/json' },
      body: JSON.stringify({ _status: 'published' }),
    })).status, 200)
    await productionChecks(command, network)
  }
  for (const collection of ['posts', 'authors', 'media']) {
    const records = (await (await fetch(`${baseURL}/api/${collection}?draft=true`, { headers: { Cookie: cookie.split(';')[0], Origin: baseURL } })).json()).docs
    assert.equal(records.length, 1, `one seeded ${collection} record`)
    const response = await fetch(`${baseURL}/api/${collection}/${records[0].id}`, { method: 'DELETE', headers: { Cookie: cookie.split(';')[0], Origin: baseURL } })
    assert.equal(response.status, 200)
  }
  console.log('PASS: local fixture is repeatable and creates only a private draft/metadata')
  if (!['blog', 'production'].includes(process.env.CMS_TEST_SCOPE || '')) {
    await editorialChecks(baseURL, cookie.split(';')[0], mailURL)
    const imageURLs = await mediaChecks(baseURL, cookie.split(';')[0], async () => {
      if (imageContainer) {
        await command('docker', ['restart', imageContainer])
      } else {
        server!.kill('SIGTERM')
        await once(server!, 'exit')
        server = spawn(process.execPath, ['.next/standalone/server.js'], {
          env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(httpPort) }, stdio: ['ignore', 'pipe', 'pipe'],
        })
        server.stdout!.on('data', data => { serverLog += data })
        server.stderr!.on('data', data => { serverLog += data })
      }
      await waitUntil(async () => (await fetch(`${baseURL}/health/ready`)).ok, 'restarted CMS')
    })
    await command('node', ['../frontend/scripts/check-cms-image-render.mjs'], {
      ...process.env, CMS_TEST_MOBILE_IMAGE_URL: imageURLs.mobile, CMS_TEST_DESKTOP_IMAGE_URL: imageURLs.desktop,
    })
    console.log('PASS: real CMS images render through the marketplace frontend at mobile/desktop widths')
  }
  await blogHarness?.run(cookie.split(';')[0])

  const after = await command('docker', ['exec', databaseContainer, 'pg_dump', '-U', 'postgres', '--schema-only', '--no-owner', 'fishing_marketplace'])
  // Newer pg_dump embeds random restriction tokens; ignore only those lines.
  const normalize = (dump: string) => dump.split('\n').filter(line => !/^\\(un)?restrict /.test(line)).join('\n')
  assert.equal(normalize(after), normalize(before))
  assert.deepEqual((await marketplace.query('SELECT * FROM marketplace_sentinel')).rows, [{ id: 1, value: 'preserve-existing-data' }])
  await marketplace.end()
  await cms.end()
  console.log('PASS: marketplace schema/data unchanged; CMS integration checks passed')
} catch (error) {
  if (imageContainer) serverLog = await command('docker', ['logs', imageContainer]).catch(() => '')
  console.error(serverLog.split('\n').slice(-60).join('\n'))
  throw error
} finally {
  await blogHarness?.close()
  if (server && server.exitCode === null) {
    server.kill('SIGTERM')
    await once(server, 'exit')
  }
  if (imageContainer) await command('docker', ['rm', '--force', imageContainer])
  if (mailContainer) await command('docker', ['rm', '--force', mailContainer])
  if (minioContainer) await command('docker', ['rm', '--force', minioContainer])
  await Promise.all(clients.map(client => client.end()))
  if (databaseContainer) await command('docker', ['rm', '--force', databaseContainer])
  if (network) await command('docker', ['network', 'rm', network])
  process.env = originalEnv
}

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import path from 'node:path'

const root = path.resolve('..')
const project = `szp-cms-compose-${randomUUID()}`
const args = ['compose', '--project-name', project, '--env-file', '.env.example',
  '-f', 'docker-compose.yml', '-f', 'docker-compose.cms.yml', '-f', 'cms/tests/compose.override.yml']
const env = {
  ...process.env, APP_ENV_FILE: path.join(root, '.env.example'),
  POSTGRES_USER: 'postgres', POSTGRES_DB: 'fishing_marketplace',
  POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
  CMS_DATABASE_PASSWORD: randomBytes(24).toString('hex'),
  CMS_SECRET: randomBytes(32).toString('hex'),
  CMS_S3_ACCESS_KEY_ID: 'szp-cms', CMS_S3_SECRET_ACCESS_KEY: randomBytes(24).toString('hex'),
  CMS_BOOTSTRAP_EMAIL: 'compose-editor@example.test',
  CMS_BOOTSTRAP_PASSWORD: randomBytes(24).toString('hex'),
}

async function compose(command: string[]) {
  const child = spawn('docker', [...args, ...command], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', data => { output += data })
  child.stderr.on('data', data => { output += data })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(`Compose ${command.join(' ')} failed:\n${output}`)
  return output.trim()
}

try {
  console.log('Starting isolated Compose foundation rehearsal...')
  await compose(['up', '--build', '--detach', '--wait', '--wait-timeout', '180', 'cms'])
  const address = await compose(['port', 'cms', '3002'])
  assert.equal((await fetch(`http://${address}/health/ready`)).status, 200)
  await compose(['run', '--rm', '--no-deps', '-e', 'CMS_BOOTSTRAP_EMAIL', '-e', 'CMS_BOOTSTRAP_PASSWORD', 'cms', 'pnpm', 'bootstrap'])
  // Repeat the documented provisioning/migration path against the existing volume.
  await compose(['run', '--rm', '--no-deps', 'cms-provision'])
  await compose(['run', '--rm', '--no-deps', 'cms-migrate'])
  await compose(['run', '--rm', '--no-deps', 'cms-storage-provision'])
  const login = await fetch(`http://${address}/api/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3002' },
    body: JSON.stringify({ email: env.CMS_BOOTSTRAP_EMAIL, password: env.CMS_BOOTSTRAP_PASSWORD }),
  })
  assert.equal(login.status, 200)
  console.log('PASS: fresh Compose startup, bootstrap, existing-volume provisioning/migrations, and editor login')
} catch (error) {
  console.error(await compose(['logs', '--no-color', '--tail', '40', 'cms', 'cms-migrate', 'cms-provision']).catch(() => ''))
  throw error
} finally {
  // The generated project name owns only this rehearsal's synthetic volumes/services.
  await compose(['down', '--volumes', '--remove-orphans'])
}

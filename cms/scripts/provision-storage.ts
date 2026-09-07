import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { CMS_MEDIA_BUCKET, storageEnvironment } from '../src/storage'

if (existsSync('.env')) loadEnvFile('.env')
async function provisionStorage() {
  const storage = storageEnvironment()
  const endpoint = new URL(String(storage.config.endpoint))
  if (!['development', 'test'].includes(process.env.CMS_ENV || '') || !['localhost', '127.0.0.1', 'minio'].includes(endpoint.hostname) || storage.bucket !== CMS_MEDIA_BUCKET || process.env.CMS_S3_ACCESS_KEY_ID !== 'szp-cms') {
    throw new Error('Local MinIO provisioning only supports the dedicated CMS bucket and szp-cms user.')
  }
  if (!process.env.CMS_MINIO_ROOT_USER || !process.env.CMS_MINIO_ROOT_PASSWORD) throw new Error('Provide local MinIO administrator credentials.')
  endpoint.username = process.env.CMS_MINIO_ROOT_USER
  endpoint.password = process.env.CMS_MINIO_ROOT_PASSWORD
  const env = { ...process.env, MC_HOST_cms: endpoint.toString() }
  async function mc(args: string[]) {
    const child = spawn('mc', args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', () => {})
    const [code] = await once(child, 'exit')
    if (code !== 0) throw new Error('MinIO command failed.')
    return output
  }
  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await mc(['ready', 'cms']); ready = true; break } catch { await new Promise(resolve => setTimeout(resolve, 1000)) }
  }
  if (!ready) throw new Error('Local MinIO is unavailable.')
  // Refuse an existing CMS identity carrying unrelated permissions.
  const user = await mc(['admin', 'user', 'info', 'cms', 'szp-cms', '--json']).catch(() => '')
  if (user) {
    const info = JSON.parse(user)
    if ((info.policyName && info.policyName !== 'szp-cms-media') || info.memberOf?.length) throw new Error('Existing CMS storage user has unexpected permissions.')
  }
  await mc(['mb', '--ignore-existing', `cms/${CMS_MEDIA_BUCKET}`])
  await mc(['anonymous', 'set-json', 'scripts/storage-public-policy.json', `cms/${CMS_MEDIA_BUCKET}`])
  await mc(['admin', 'policy', 'create', 'cms', 'szp-cms-media', 'scripts/storage-policy.json'])
  await mc(['admin', 'user', 'add', 'cms', 'szp-cms', process.env.CMS_S3_SECRET_ACCESS_KEY!])
  await mc(['admin', 'policy', 'attach', 'cms', 'szp-cms-media', '--user', 'szp-cms'])
  console.log('Dedicated CMS bucket and restricted local storage user are ready.')
}
provisionStorage().catch(() => {
  console.error('CMS storage provisioning failed. Check local MinIO configuration, mc availability, and existing CMS user permissions.')
  process.exitCode = 1
})

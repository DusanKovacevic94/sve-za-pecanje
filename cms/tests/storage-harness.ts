import assert from 'node:assert/strict'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { CMS_MEDIA_BUCKET, storageEnvironment } from '../src/storage'

type Command = (file: string, args: string[], env?: NodeJS.ProcessEnv) => Promise<string>
export async function prepareStorage(command: Command, network: string, minio: string, rootPassword: string) {
  const address = await command('docker', ['port', minio, '9000/tcp'])
  Object.assign(process.env, {
    CMS_S3_ENDPOINT: `http://${address}`, CMS_S3_PUBLIC_URL: `http://${address}/${CMS_MEDIA_BUCKET}`,
    CMS_S3_REGION: 'us-east-1', CMS_S3_FORCE_PATH_STYLE: 'true', CMS_S3_BUCKET: CMS_MEDIA_BUCKET,
    CMS_S3_ACCESS_KEY_ID: 'szp-cms', CMS_S3_SECRET_ACCESS_KEY: randomBytes(24).toString('hex'),
  })
  const rootURL = new URL('http://minio:9000')
  rootURL.username = 'minioadmin'
  rootURL.password = rootPassword
  const mc = (args: string[]) => command('docker', ['run', '--rm', '--network', network,
    '--env', 'MC_HOST_cms', '--mount', `type=bind,src=${path.resolve('scripts')},dst=/policies,readonly`,
    'minio/mc:RELEASE.2025-08-13T08-35-41Z', ...args], { ...process.env, MC_HOST_cms: rootURL.toString() })
  await mc(['ready', 'cms'])
  await mc(['mb', `cms/${CMS_MEDIA_BUCKET}`])
  await mc(['anonymous', 'set-json', '/policies/storage-public-policy.json', `cms/${CMS_MEDIA_BUCKET}`])
  await mc(['admin', 'policy', 'create', 'cms', 'szp-cms-media', '/policies/storage-policy.json'])
  await mc(['admin', 'user', 'add', 'cms', 'szp-cms', process.env.CMS_S3_SECRET_ACCESS_KEY!])
  await mc(['admin', 'policy', 'attach', 'cms', 'szp-cms-media', '--user', 'szp-cms'])
  const storage = storageEnvironment()
  const admin = new S3Client({ ...storage.config, credentials: { accessKeyId: 'minioadmin', secretAccessKey: rootPassword } })
  const cms = new S3Client(storage.config)
  try {
    for (const Bucket of ['fishing-marketplace', 'private-exports']) {
      await admin.send(new CreateBucketCommand({ Bucket }))
      await admin.send(new PutObjectCommand({ Bucket, Key: 'sentinel', Body: 'preserve-this-object' }))
      for (const operation of [new PutObjectCommand({ Bucket, Key: 'sentinel', Body: 'forbidden' }), new DeleteObjectCommand({ Bucket, Key: 'sentinel' }), new GetObjectCommand({ Bucket, Key: 'sentinel' })]) {
        await assert.rejects(cms.send(operation), (error: unknown) => (error as { name: string }).name === 'AccessDenied')
      }
      assert.equal(await (await admin.send(new GetObjectCommand({ Bucket, Key: 'sentinel' }))).Body!.transformToString(), 'preserve-this-object')
    }
    await assert.rejects(cms.send(new PutObjectCommand({ Bucket: CMS_MEDIA_BUCKET, Key: 'outside-media-prefix', Body: 'forbidden' })))
  } finally { admin.destroy(); cms.destroy() }
  console.log('PASS: CMS credentials cannot read/write/delete listing or export objects, or write outside media/')
}

import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import https from 'node:https'
import path from 'node:path'
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  PutBucketVersioningCommand,
  DeleteObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3'
import { prepareStorage } from './storage-harness'
import { storageEnvironment } from '../src/storage'

type Command = (
  file: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) => Promise<string>

// Called only inside integration.ts's generated Docker/DB/storage fixture. It accepts
// container IDs created by that harness, never a production connection URL.
export async function productionChecks(
  command: Command,
  sourceNetwork: string,
) {
  const savedEnv = { ...process.env }
  const id = `szp-cms-recovery-${randomUUID()}`
  const containers: string[] = []
  let network = '',
    volume = ''
  const runtimeImage =
    process.env.CMS_PRODUCTION_TEST_IMAGE || 'szp-cms:078-rehearsal'
  const toolsImage =
    process.env.CMS_PRODUCTION_TOOLS_IMAGE || 'szp-cms:078-tools'
  const run = async (args: string[], env = process.env) => {
    const output = await command(
      'docker',
      ['run', '--detach', '--rm', ...args],
      env,
    )
    const container = output
      .split('\n')
      .find((line) => /^[a-f0-9]{64}$/.test(line))
    assert.ok(container, 'Docker returned a concrete container ID')
    containers.push(container)
    return container
  }
  const sourceStorage = storageEnvironment()
  const source = new S3Client(sourceStorage.config)
  try {
    volume = await command('docker', ['volume', 'create', id])
    // Run the actual backup script with restricted CMS credentials. The same volume
    // also receives a marketplace dump, exercising the two-database layout.
    for (const database of ['svezapecanje_cms', 'fishing_marketplace']) {
      await command(
        'docker',
        [
          'run',
          '--rm',
          '--network',
          sourceNetwork,
          '--env',
          'PGHOST=postgres',
          '--env',
          'PGUSER',
          '--env',
          'PGPASSWORD',
          '--env',
          'DATABASE_URL',
          '--env',
          `BACKUP_DATABASE=${database}`,
          '--mount',
          `type=volume,src=${volume},dst=/backups`,
          '--mount',
          `type=bind,src=${path.resolve('../backend/scripts/backup_db.sh')},dst=/backup.sh,readonly`,
          '--entrypoint',
          'sh',
          'szp-backup:078-rehearsal',
          '/backup.sh',
        ],
        {
          ...process.env,
          PGUSER: database === 'svezapecanje_cms' ? 'szp_cms' : 'postgres',
          PGPASSWORD:
            database === 'svezapecanje_cms'
              ? process.env.CMS_DATABASE_PASSWORD
              : process.env.CMS_PROVISION_PASSWORD,
          DATABASE_URL:
            database === 'svezapecanje_cms'
              ? ''
              : `postgresql+psycopg://postgres:${process.env.CMS_PROVISION_PASSWORD}@postgres/fishing_marketplace`,
        },
      )
    }
    const dump = await command('docker', [
      'run',
      '--rm',
      '--mount',
      `type=volume,src=${volume},dst=/backups,readonly`,
      'postgres:16-alpine',
      'find',
      '/backups/svezapecanje_cms/daily',
      '-name',
      '*.dump',
    ])
    assert.match(
      dump,
      /^\/backups\/svezapecanje_cms\/daily\/svezapecanje_cms-[0-9TZ]+\.dump$/,
    )
    // Immutable objects make a DB-first, object-copy-second snapshot recoverable
    // when editorial writes/deletes are quiesced (as they are in this harness).
    const objects =
      (
        await source.send(
          new ListObjectsV2Command({
            Bucket: sourceStorage.bucket,
            Prefix: 'media/',
          }),
        )
      ).Contents || []
    assert.ok(
      objects.length > 0,
      'fixture has real media and generated variants',
    )
    const snapshot = await Promise.all(
      objects.map(async ({ Key }) => ({
        key: Key!,
        bytes: await (
          await source.send(
            new GetObjectCommand({ Bucket: sourceStorage.bucket, Key }),
          )
        ).Body!.transformToByteArray(),
      })),
    )
    const mediaSnapshot = `:local:/backups/cms-media/snapshots/${id}/media`
    const rcloneEnv = () => ({
      ...process.env,
      RCLONE_CONFIG_CMS_TYPE: 's3',
      RCLONE_CONFIG_CMS_PROVIDER: 'Minio',
      RCLONE_CONFIG_CMS_ENDPOINT: 'http://minio:9000',
      RCLONE_CONFIG_CMS_REGION: 'us-east-1',
      RCLONE_CONFIG_CMS_ACCESS_KEY_ID: process.env.CMS_S3_ACCESS_KEY_ID,
      RCLONE_CONFIG_CMS_SECRET_ACCESS_KEY: process.env.CMS_S3_SECRET_ACCESS_KEY,
      RCLONE_CONFIG_CMS_NO_CHECK_BUCKET: 'true',
      RCLONE_CONFIG_CMS_NO_HEAD_OBJECT: 'true',
      CMS_MEDIA_BACKUP_SOURCE: `cms:${sourceStorage.bucket}/media`,
      CMS_MEDIA_BACKUP_SNAPSHOT: mediaSnapshot,
    })
    const mediaCommand = (onNetwork: string, args: string[]) =>
      command(
        'docker',
        [
          'run',
          '--rm',
          '--network',
          onNetwork,
          ...Object.keys(rcloneEnv())
            .filter(
              (key) =>
                key.startsWith('RCLONE_CONFIG_CMS_') ||
                key.startsWith('CMS_MEDIA_BACKUP_'),
            )
            .flatMap((key) => ['--env', key]),
          '--mount',
          `type=volume,src=${volume},dst=/backups`,
          '--mount',
          `type=bind,src=${path.resolve('../ops/backup/snapshot_cms_media.sh')},dst=/snapshot.sh,readonly`,
          '--entrypoint',
          'sh',
          'szp-backup:078-rehearsal',
          ...args,
        ],
        rcloneEnv(),
      )
    await mediaCommand(sourceNetwork, [
      '-c',
      `mkdir -p '/backups/cms-media/snapshots/${id}/media' && sh /snapshot.sh`,
    ])
    await assert.rejects(
      mediaCommand(sourceNetwork, ['/snapshot.sh']),
      /Snapshot destination is not empty/,
    )

    network = await command('docker', ['network', 'create', id])
    const password = randomBytes(24).toString('hex')
    const db = await run(
      [
        '--network',
        network,
        '--network-alias',
        'postgres',
        '--env',
        'POSTGRES_PASSWORD',
        'postgres:16-alpine',
      ],
      { ...process.env, POSTGRES_PASSWORD: password },
    )
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await command('docker', [
          'exec',
          db,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'postgres',
        ])
        break
      } catch {
        if (attempt === 59)
          throw new Error('Restore database did not become ready')
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    const minio = await run(
      [
        '--network',
        network,
        '--network-alias',
        'minio',
        '--publish',
        '127.0.0.1::9000',
        '--env',
        'MINIO_ROOT_USER=minioadmin',
        '--env',
        'MINIO_ROOT_PASSWORD',
        'minio/minio:latest',
        'server',
        '/data',
      ],
      { ...process.env, MINIO_ROOT_PASSWORD: password },
    )
    await prepareStorage(command, network, minio, password)
    const restoredStorage = storageEnvironment()
    const target = new S3Client(restoredStorage.config)
    const storageAdmin = new S3Client({
      ...restoredStorage.config,
      credentials: { accessKeyId: 'minioadmin', secretAccessKey: password },
    })
    try {
      await storageAdmin.send(
        new PutBucketVersioningCommand({
          Bucket: restoredStorage.bucket,
          VersioningConfiguration: { Status: 'Enabled' },
        }),
      )
      await mediaCommand(network, [
        '-c',
        `rclone copy '${mediaSnapshot}' 'cms:${restoredStorage.bucket}/media' --immutable && rclone check '${mediaSnapshot}' 'cms:${restoredStorage.bucket}/media' --download`,
      ])
      const first = snapshot[0]
      // Rehearse recovering an accidental delete marker from retained object versions.
      await target.send(
        new DeleteObjectCommand({
          Bucket: restoredStorage.bucket,
          Key: first.key,
        }),
      )
      const versions = await storageAdmin.send(
        new ListObjectVersionsCommand({
          Bucket: restoredStorage.bucket,
          Prefix: first.key,
        }),
      )
      const prior = versions.Versions!.find(
        (version) => version.Key === first.key,
      )!
      const recovered = await (
        await storageAdmin.send(
          new GetObjectCommand({
            Bucket: restoredStorage.bucket,
            Key: first.key,
            VersionId: prior.VersionId,
          }),
        )
      ).Body!.transformToByteArray()
      await target.send(
        new PutObjectCommand({
          Bucket: restoredStorage.bucket,
          Key: first.key,
          Body: recovered,
          ContentType: 'image/webp',
        }),
      )
      for (const object of snapshot) {
        const bytes = await (
          await target.send(
            new GetObjectCommand({
              Bucket: restoredStorage.bucket,
              Key: object.key,
            }),
          )
        ).Body!.transformToByteArray()
        assert.equal(
          createHash('sha256').update(bytes).digest('hex'),
          createHash('sha256').update(object.bytes).digest('hex'),
        )
      }
    } finally {
      target.destroy()
      storageAdmin.destroy()
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      CMS_ENV: 'production',
      CMS_DATABASE_HOST: 'postgres',
      CMS_DATABASE_PORT: '5432',
      CMS_PUBLIC_URL: 'https://cms.fixture.test',
      CMS_FRONTEND_URL: 'https://fixture.test',
      CMS_RESEND_API_KEY: 're_fixture_not_a_real_provider_key',
      CMS_EMAIL_FROM: 'cms@fixture.test',
      CMS_S3_ENDPOINT: 'https://storage.fixture.test',
      CMS_S3_PUBLIC_URL: `https://storage.fixture.test/${restoredStorage.bucket}`,
      CMS_PROVISION_USER: 'postgres',
      CMS_PROVISION_PASSWORD: password,
      CMS_MAINTENANCE_CONFIRM: 'svezapecanje_cms',
    }
    // Do not inject source process/marketplace secrets into the restored runtime.
    const keys = [
      'CMS_ENV',
      'CMS_DATABASE_HOST',
      'CMS_DATABASE_PORT',
      'CMS_DATABASE_PASSWORD',
      'CMS_SECRET',
      'CMS_PUBLIC_URL',
      'CMS_FRONTEND_URL',
      'CMS_RESEND_API_KEY',
      'CMS_EMAIL_FROM',
      'CMS_S3_ENDPOINT',
      'CMS_S3_PUBLIC_URL',
      'CMS_S3_BUCKET',
      'CMS_S3_REGION',
      'CMS_S3_FORCE_PATH_STYLE',
      'CMS_S3_ACCESS_KEY_ID',
      'CMS_S3_SECRET_ACCESS_KEY',
    ]
    const pass = (names: string[]) => names.flatMap((key) => ['--env', key])
    const maintenance = (args: string[], extra: string[] = []) =>
      command(
        'docker',
        [
          'run',
          '--rm',
          '--network',
          network,
          ...pass([...keys, ...extra]),
          toolsImage,
          ...args,
        ],
        env,
      )
    await maintenance(
      ['pnpm', 'db:provision'],
      [
        'CMS_PROVISION_USER',
        'CMS_PROVISION_PASSWORD',
        'CMS_MAINTENANCE_CONFIRM',
      ],
    )
    await command(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        network,
        '--env',
        'PGPASSWORD',
        '--mount',
        `type=volume,src=${volume},dst=/backups,readonly`,
        'postgres:16-alpine',
        'pg_restore',
        '--exit-on-error',
        '--no-owner',
        '--no-acl',
        '-h',
        'postgres',
        '-U',
        'szp_cms',
        '-d',
        'svezapecanje_cms',
        dump,
      ],
      { ...process.env, PGPASSWORD: env.CMS_DATABASE_PASSWORD },
    )
    await maintenance(['pnpm', 'migrate'])
    await assert.rejects(
      maintenance(
        ['pnpm', 'bootstrap'],
        [
          'CMS_BOOTSTRAP_EMAIL',
          'CMS_BOOTSTRAP_PASSWORD',
          'CMS_MAINTENANCE_CONFIRM',
        ],
      ),
      /Bootstrap refused/,
    )
    const cms = await run(
      [
        '--network',
        network,
        '--network-alias',
        'cms',
        '--read-only',
        '--tmpfs',
        '/tmp',
        '--tmpfs',
        '/app/.next/cache',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges:true',
        ...pass(keys),
        runtimeImage,
      ],
      env,
    )
    assert.notEqual(await command('docker', ['exec', cms, 'id', '-u']), '0')
    // Lightweight upstream fixtures verify routing, not marketplace business behavior.
    await run([
      '--network',
      network,
      '--network-alias',
      'frontend',
      '--network-alias',
      'backend',
      '--network-alias',
      'umami',
      'node:22-alpine',
      'node',
      '-e',
      "for(const port of [3000,8000])require('http').createServer((q,r)=>r.end(JSON.stringify({port,path:q.url}))).listen(port)",
    ])
    const caddy = await run([
      '--network',
      network,
      '--publish',
      '127.0.0.1::443',
      '--env',
      'APP_DOMAIN=fixture.test',
      '--mount',
      `type=bind,src=${path.resolve('../ops/caddy/Caddyfile')},dst=/etc/caddy/production.Caddyfile,readonly`,
      '--mount',
      `type=bind,src=${path.resolve('tests/production.Caddyfile')},dst=/etc/caddy/Caddyfile,readonly`,
      'caddy:2.8-alpine',
    ])
    const proxyPort = Number(
      (await command('docker', ['port', caddy, '443/tcp'])).split(':').at(-1),
    )
    let ca = ''
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        ca = await command('docker', [
          'exec',
          caddy,
          'cat',
          '/data/caddy/pki/authorities/local/root.crt',
        ])
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    assert.ok(
      ca.includes('BEGIN CERTIFICATE'),
      'local CA generated without ACME',
    )
    const request = (
      host: string,
      url: string,
      method = 'GET',
      data?: object,
      headers: Record<string, string> = {},
    ) =>
      new Promise<{
        status: number
        headers: import('node:http').IncomingHttpHeaders
        body: string
      }>((resolve, reject) => {
        const req = https.request(
          {
            hostname: '127.0.0.1',
            port: proxyPort,
            servername: host,
            ca,
            path: url,
            method,
            headers: {
              Host: host,
              'Content-Type': 'application/json',
              ...headers,
            },
            timeout: 10000,
          },
          (res) => {
            let body = ''
            res.on('data', (chunk) => {
              body += chunk
            })
            res.on('end', () =>
              resolve({ status: res.statusCode!, headers: res.headers, body }),
            )
          },
        )
        req.on('error', reject)
        req.on('timeout', () => req.destroy(new Error('TLS rehearsal timeout')))
        req.end(data ? JSON.stringify(data) : undefined)
      })
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if ((await request('cms.fixture.test', '/health/ready')).status === 200)
          break
      } catch {
        // The local CA can exist just before the TLS listener starts accepting.
      }
      if (attempt === 59)
        throw new Error('Restored production CMS is not ready')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    const login = await request(
      'cms.fixture.test',
      '/api/users/login',
      'POST',
      {
        email: savedEnv.CMS_BOOTSTRAP_EMAIL,
        password: savedEnv.CMS_BOOTSTRAP_PASSWORD,
      },
      { Origin: 'https://cms.fixture.test' },
    )
    assert.equal(login.status, 200, login.body)
    const cookie = login.headers['set-cookie']!.find((value) =>
      value.startsWith('szp-cms-token='),
    )!
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /Secure/)
    assert.doesNotMatch(cookie, /Domain=/)
    const auth = {
      Cookie: cookie.split(';')[0],
      Origin: 'https://cms.fixture.test',
    }
    assert.ok(
      (await request('cms.fixture.test', '/api/users')).status >= 400,
      'anonymous users cannot read editor accounts',
    )
    const admin = await request(
      'cms.fixture.test',
      '/admin',
      'GET',
      undefined,
      auth,
    )
    assert.equal(admin.status, 200)
    assert.match(String(admin.headers['x-robots-tag']), /noindex/)
    const posts = JSON.parse(
      (
        await request(
          'cms.fixture.test',
          '/api/posts?draft=true',
          'GET',
          undefined,
          auth,
        )
      ).body,
    )
    assert.equal(posts.docs.length, 1)
    assert.equal(posts.docs[0].slug, 'probni-vodic-za-izbor-opreme')
    const published = JSON.parse(
      (await request('cms.fixture.test', '/api/posts?depth=2')).body,
    ).docs
    assert.equal(
      published.length,
      1,
      'published post remains public after restore',
    )
    assert.equal(published[0].author.name, 'Probni autor')
    assert.ok(
      JSON.stringify(published[0].body).includes('Pre izbora opreme'),
      'article body restored',
    )
    const versions = JSON.parse(
      (
        await request(
          'cms.fixture.test',
          '/api/posts/versions',
          'GET',
          undefined,
          auth,
        )
      ).body,
    )
    assert.ok(versions.totalDocs > 0, 'retained article history restored')
    const media = JSON.parse(
      (await request('cms.fixture.test', '/api/media', 'GET', undefined, auth))
        .body,
    ).docs[0]
    assert.ok(
      media.url.startsWith('https://storage.fixture.test/'),
      'restored media uses isolated public base',
    )
    assert.equal(
      (await request('storage.fixture.test', new URL(media.url).pathname))
        .status,
      200,
    )
    const csrf = await request(
      'cms.fixture.test',
      `/api/posts/${posts.docs[0].id}`,
      'PATCH',
      { _status: 'published' },
      { Cookie: auth.Cookie, Origin: 'https://untrusted.fixture.test' },
    )
    assert.ok(csrf.status >= 400, 'cross-origin cookie writes rejected')
    for (const [url, port] of [
      ['/', 3000],
      ['/api/v1/categories', 8000],
      ['/health/live', 8000],
      ['/api/blog/revalidate', 3000],
    ] as const) {
      assert.equal(
        JSON.parse((await request('fixture.test', url)).body).port,
        port,
        url,
      )
    }
    await command('docker', ['stop', cms])
    containers.splice(containers.indexOf(cms), 1)
    assert.equal(
      (await request('fixture.test', '/')).status,
      200,
      'CMS outage does not take marketplace offline',
    )
    assert.ok(
      (await request('cms.fixture.test', '/health/ready')).status >= 500,
    )
    console.log(
      'PASS: real backups, isolated restricted-role restore, media checksums/version recovery, production image, verified local TLS, login/cookies/CSRF, routing and CMS outage isolation',
    )
  } catch (error) {
    console.error('Production rehearsal failed:', error)
    throw error
  } finally {
    source.destroy()
    process.env = savedEnv
    for (const container of containers.reverse())
      await command('docker', ['rm', '--force', container]).catch(
        () => undefined,
      )
    if (network)
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          await command('docker', ['network', 'rm', network])
          break
        } catch (error) {
          if (attempt === 19) throw error
          await new Promise((resolve) => setTimeout(resolve, 250))
        }
      }
    if (volume) await command('docker', ['volume', 'rm', volume])
  }
}

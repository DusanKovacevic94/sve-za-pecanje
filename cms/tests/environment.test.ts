import assert from 'node:assert/strict'
import test from 'node:test'
import { cmsEnvironment, databaseURL, requireLocalMaintenance } from '../src/environment'

const local = {
  CMS_ENV: 'development',
  CMS_SECRET: 'test-secret-with-at-least-thirty-two-characters',
  CMS_DATABASE_PASSWORD: 'password-with-@:/?#-characters',
}

test('database identity is fixed and passwords are URL encoded', () => {
  const url = new URL(databaseURL(local))
  assert.equal(url.pathname, '/svezapecanje_cms')
  assert.equal(url.username, 'szp_cms')
  assert.equal(decodeURIComponent(url.password), local.CMS_DATABASE_PASSWORD)
  assert.throws(() => databaseURL({ ...local, CMS_DATABASE_PORT: '5432/wrong' }))
})

test('runtime has no default secrets and production requires an HTTPS origin', () => {
  assert.throws(() => cmsEnvironment({}), /CMS_ENV/)
  assert.throws(() => cmsEnvironment({ CMS_ENV: 'development' }), /CMS_SECRET/)
  assert.throws(() => cmsEnvironment({ ...local, CMS_DATABASE_PASSWORD: '' }), /CMS_DATABASE_PASSWORD/)
  assert.throws(() => cmsEnvironment({ ...local, CMS_ENV: 'production' }), /HTTPS/)
  assert.throws(() => cmsEnvironment({ ...local, CMS_PUBLIC_URL: 'https://cms.example.test/path' }), /origin/)
  assert.equal(cmsEnvironment({ ...local, CMS_ENV: 'production', CMS_PUBLIC_URL: 'https://cms.example.test' }).secureCookies, true)
})

test('build imports use an unreachable database and maintenance is local-only', () => {
  assert.equal(new URL(cmsEnvironment({ CMS_BUILD: 'true' }).databaseURL).port, '1')
  requireLocalMaintenance(local)
  assert.throws(() => requireLocalMaintenance({ ...local, CMS_ENV: 'production' }))
  assert.throws(() => requireLocalMaintenance({ ...local, CMS_DATABASE_HOST: 'remote.example.test' }))
})

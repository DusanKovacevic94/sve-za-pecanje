import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  requireLocalMaintenance,
  requireOperatorMaintenance,
} from '../src/environment'

test('production maintenance requires explicit confirmation and private database host; seed remains local-only', () => {
  const env = { CMS_ENV: 'production', CMS_DATABASE_HOST: 'postgres' }
  assert.throws(() => requireOperatorMaintenance(env))
  const confirmed = { ...env, CMS_MAINTENANCE_CONFIRM: 'svezapecanje_cms' }
  assert.doesNotThrow(() => requireOperatorMaintenance(confirmed))
  assert.throws(() =>
    requireOperatorMaintenance({
      ...confirmed,
      CMS_DATABASE_HOST: 'external.example',
    }),
  )
  assert.throws(() => requireLocalMaintenance(confirmed))
})

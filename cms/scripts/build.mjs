import { spawnSync } from 'node:child_process'
import { cpSync } from 'node:fs'
import './build-social-card.mjs'

// Never use real credentials or contact a database while creating the standalone image.
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {
  stdio: 'inherit',
  env: { ...process.env, CMS_BUILD: 'true', NEXT_TELEMETRY_DISABLED: '1' },
})
if (result.status === 0) {
  cpSync('.next/static', '.next/standalone/.next/static', { recursive: true })
  cpSync('dist/social-card', '.next/standalone/dist/social-card', { recursive: true })
  cpSync('assets/social', '.next/standalone/assets/social', { recursive: true })
}
process.exit(result.status ?? 1)

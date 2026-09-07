import { spawnSync } from 'node:child_process'
import { cpSync } from 'node:fs'

// Never use real credentials or contact a database while creating the standalone image.
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {
  stdio: 'inherit',
  env: { ...process.env, CMS_BUILD: 'true', NEXT_TELEMETRY_DISABLED: '1' },
})
if (result.status === 0) {
  cpSync('.next/static', '.next/standalone/.next/static', { recursive: true })
}
process.exit(result.status ?? 1)

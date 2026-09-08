import path from 'node:path'
import { renderSocialCardCore } from './core'
import { SocialCardError } from './contract'

process.once('message', async input => {
  let response
  try {
    const result = await renderSocialCardCore(input, path.join(process.cwd(), 'assets/social'))
    response = { ok: true, result }
  } catch (error) {
    const safe = error instanceof SocialCardError ? error : new SocialCardError('unavailable')
    response = { ok: false, code: safe.code, field: safe.field }
  }
  // Do not log inputs or raw errors. Exit drops font caches and draft buffers.
  if (process.send) process.send(response, () => process.exit(0))
  else process.exit(1)
})
process.once('disconnect', () => process.exit(0))

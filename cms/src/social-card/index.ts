import path from 'node:path'
import { createSocialCardRunner } from './runner'
import type { SocialCardInput } from './contract'

export { SocialCardError } from './contract'
export type { SocialCardInput, SocialCardResult, SocialCardErrorCode } from './contract'

const run = createSocialCardRunner(path.join(process.cwd(), 'dist/social-card/worker.cjs'), process.cwd())

/** Server-only API. No endpoint, storage write, or publication side effect. */
export function renderSocialCard(input: SocialCardInput, options?: { signal?: AbortSignal }) {
  return run(input, options)
}

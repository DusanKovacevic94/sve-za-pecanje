import { fork } from 'node:child_process'
import { SocialCardError, validateSocialCardInput, type SocialCardResult, type SocialCardErrorCode } from './contract'

// Internal factory for deployment and isolated tests; never take these options from a request.
export function createSocialCardRunner(workerFile: string, cwd: string, timeoutMs = 10_000, maxConcurrent = 2) {
  let active = 0
  return async (input: unknown, options: { signal?: AbortSignal } = {}): Promise<SocialCardResult> => {
    const copy = validateSocialCardInput(input)
    if (options.signal?.aborted) throw new SocialCardError('cancelled')
    if (active >= maxConcurrent) throw new SocialCardError('busy')
    active++
    return new Promise((resolve, reject) => {
      let response: { ok: boolean; result?: SocialCardResult; code?: SocialCardErrorCode; field?: 'title' | 'description' } | undefined
      let failure: SocialCardError | undefined
      let child: ReturnType<typeof fork>
      try {
        child = fork(workerFile, [], {
          cwd, serialization: 'advanced', stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
          execArgv: ['--max-old-space-size=128'],
          env: { NODE_ENV: 'production', LANG: 'C.UTF-8', UV_THREADPOOL_SIZE: '1', MALLOC_ARENA_MAX: '2' },
        })
      } catch {
        active--
        reject(new SocialCardError('unavailable'))
        return
      }
      const stop = (code: SocialCardErrorCode) => {
        failure ||= new SocialCardError(code)
        child.kill('SIGKILL')
      }
      const timer = setTimeout(() => stop('timeout'), timeoutMs)
      const abort = () => stop('cancelled')
      options.signal?.addEventListener('abort', abort, { once: true })
      if (options.signal?.aborted) abort()
      child.once('message', message => { response = message as typeof response })
      child.once('error', () => { failure ||= new SocialCardError('unavailable') })
      // Release capacity only after the subprocess has actually stopped, including timeout.
      child.once('close', code => {
        clearTimeout(timer)
        options.signal?.removeEventListener('abort', abort)
        active--
        if (failure) return reject(failure)
        if (code !== 0 || !response) return reject(new SocialCardError('unavailable'))
        if (!response.ok) return reject(new SocialCardError(response.code || 'unavailable', response.field))
        const result = response.result
        if (!result || !Buffer.isBuffer(result.jpeg) || result.jpeg.length > 1_000_000 ||
          typeof result.svg !== 'string' || result.svg.length > 1_000_000 || result.width !== 1080 || result.height !== 1350) {
          return reject(new SocialCardError('unavailable'))
        }
        resolve(result)
      })
      child.send(copy, error => { if (error) stop('unavailable') })
    })
  }
}

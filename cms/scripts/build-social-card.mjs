import { build } from 'esbuild'

// Bundle pure-JS font shaping; reuse Sharp's native dependency in Next's standalone image.
await build({
  entryPoints: ['src/social-card/index.ts', 'src/social-card/worker.ts'],
  outdir: 'dist/social-card', outExtension: { '.js': '.cjs' },
  bundle: true, platform: 'node', target: 'node22', format: 'cjs',
  external: ['sharp'], sourcemap: false, legalComments: 'eof',
})

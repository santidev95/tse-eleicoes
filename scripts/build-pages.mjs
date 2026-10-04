import { execFileSync } from 'node:child_process'

// A production deployment must never inherit a local mock/simulation selection.
const env = {
  ...process.env,
  VITE_ELECTION_DATA_SOURCE: 'tse',
  VITE_TSE_PROXY_URL: '/api/tse/presidential',
}
for (const [file, ...args] of [
  ['node_modules/typescript/bin/tsc', '-b'],
  ['node_modules/vite/bin/vite.js', 'build'],
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.pages.json'],
  [
    'node_modules/wrangler/bin/wrangler.js',
    'pages',
    'functions',
    'build',
    '--outdir',
    'artifacts/pages-function',
    '--minify',
  ],
])
  execFileSync(process.execPath, [file, ...args], { env, stdio: 'inherit' })

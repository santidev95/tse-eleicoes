import { readFile, writeFile, mkdir } from 'node:fs/promises'
const files = []
for (const name of ['server/tse-source.ts', 'server/tse-adapter.ts', 'src/domain/election.ts', 'src/data/states.ts'])
  files.push({ name, content: await readFile(name, 'utf8') })
files.push({ name: 'index.ts', content: (await readFile('supabase/functions/tse-collect/index.ts', 'utf8')).replaceAll('../../../server/', './server/') })
files.push({ name: 'deno.json', content: await readFile('supabase/functions/tse-collect/deno.json', 'utf8') })
await mkdir('artifacts', { recursive: true })
await writeFile('artifacts/tse-edge-package.json', JSON.stringify(files))
console.log(`Edge package: ${files.length} files; shared adapter included.`)

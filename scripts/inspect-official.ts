import { mkdir, writeFile } from 'node:fs/promises'
const paths = {
  config: 'https://resultados.tse.jus.br/oficial/comum/config/ele-c.json',
  br: 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json',
}
await mkdir('artifacts/tse-official', { recursive: true })
for (const [name, url] of Object.entries(paths)) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  console.log(name, response.status, response.headers.get('content-type'))
  if (!response.ok) break // Do not probe alternate paths after a 404.
  const raw = await response.json()
  await writeFile(`artifacts/tse-official/${name}.json`, JSON.stringify(raw, null, 2))
  if (name === 'config') console.log(JSON.stringify(raw.pl?.map((p: { cd: string; c: string; e: { cd: string; t: string; nm: string; abr: unknown }[] }) => ({ pleito: p.cd, cycle: p.c, elections: p.e }))))
  else console.log(JSON.stringify({
    election: raw.ele, round: raw.t, phase: raw.f, scope: raw.cdabr,
    disclosure: raw.dv, generatedDate: raw.dg, generatedTime: raw.hg,
    totalizationDate: raw.dt, totalizationTime: raw.ht, sections: raw.s,
    candidates: raw.carg?.filter((c: {cd: string}) => c.cd === '1')
      .flatMap((c: {agr: {par: {cand: unknown[]}[]}[]}) => c.agr.flatMap(g => g.par.flatMap(p => p.cand))),
  }, null, 2))
}
const changelog = await fetch('https://supabase.com/changelog.md', { signal: AbortSignal.timeout(15_000) })
const lines = (await changelog.text()).split('\n')
console.log('Supabase changelog status:', changelog.status)
console.log(lines.slice(0, 25).join('\n'))
console.log(lines.filter(line => /breaking.change|secret key|api key|database|postgres|functions|cron/i.test(line)).slice(0, 20).join('\n'))

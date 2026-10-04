import fs from 'node:fs/promises'
const base = 'https://resultados-sim.tse.jus.br/simulado/simulado2026'
await fs.mkdir('artifacts/tse', { recursive: true })
for (const [name, path] of [
  ['config', '/comum/config/ele-c.json'],
  ['br-result', '/ele2026/21270/dados/br/br-c0001-e021270-u.json'],
  ['br-progress', '/ele2026/21270/dados/br/br-e021270-ab.json'],
  ['mt-result', '/ele2026/21270/dados/mt/mt-c0001-e021270-u.json'],
  ['mt-progress', '/ele2026/21270/dados/mt/mt-e021270-ab.json'],
]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) })
  console.log(name, response.status, response.headers.get('content-type'))
  if (response.ok) {
    const data = await response.json()
    await fs.writeFile(`artifacts/tse/${name}.json`, JSON.stringify(data, null, 2))
    console.log(JSON.stringify(data).slice(0, 9500))
  }
}

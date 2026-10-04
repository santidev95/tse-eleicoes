import fs from 'node:fs'
for (const name of ['config', 'br-result', 'mt-result']) {
  const data = JSON.parse(fs.readFileSync(`artifacts/tse/${name}.json`, 'utf8'))
  if (name === 'config') { console.log(name, JSON.stringify(data).slice(0, 5000)); continue }
  console.log(name, JSON.stringify({ ...data, carg: undefined, s: data.s, v: data.v, e: undefined }))
  console.log('candidates', JSON.stringify(data.carg?.map(c => ({ ...c, agr: c.agr?.map(a => ({ n:a.n, par:a.par?.map(p => ({n:p.n,cand:p.cand?.map(x => ({n:x.n,sqcand:x.sqcand,nm:x.nm,nmu:x.nmu,dvt:x.dvt,vap:x.vap,pvap:x.pvap,pvapn:x.pvapn,st:x.st}))})) })) }))))
}

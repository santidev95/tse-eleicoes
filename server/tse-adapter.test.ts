import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { states } from '../src/data/states'
import { countedPercent, resultOverview } from '../src/domain/election'
import { decodeEa20, normalizeSimulation, resultUrl } from './tse-adapter'
import { createTseSource } from './tse-source'

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/tse/${name}.json`, 'utf8'))
const br = fixture('br')
const mt = fixture('mt')
const rawFiles = () => new Map<string, unknown>([
  ['br', br], ...states.map(state => [state.uf.toLowerCase(), { ...mt, cdabr: state.uf.toLowerCase() }] as [string, unknown]),
])
describe('official simulation EA20 adapter', () => {
  it('preserves the TSE percentage denominator and vote destination', () => {
    const data = normalizeSimulation(rawFiles(), '2026-10-04T18:00:00.000Z')
    const overview = resultOverview(data.national, data.candidates)
    expect(data.source).toBe('tse-sim')
    expect(data.candidates).toHaveLength(13)
    expect(countedPercent(data.national)).toBe(100)
    expect(overview.first.number).toBe('57')
    expect(overview.first.percent).toBe(8.712251427)
    expect(overview.first.destination).toBe('Anulado sub judice')
    expect(overview.second.number).toBe('89')
    expect(data.updatedAt).toBe('2026-09-29T19:29:12.000Z')
    expect(data.upstream?.files).toHaveLength(28)
    expect(data.national.votes).toEqual(decodeEa20(br, 'br').result.votes)
    expect(data.candidates.find(c => c.number === '89')?.name).toContain('"TSE"')
  })
  it('rejects wrong election, production relabeling, wrong UF and incomplete downloads', () => {
    expect(() => decodeEa20({ ...br, ele: '6257' }, 'br')).toThrow()
    expect(() => decodeEa20({ ...br, f: 'o' }, 'br')).toThrow()
    expect(() => decodeEa20(mt, 'sp')).toThrow('Abrangência')
    const files = rawFiles(); files.delete('ac')
    expect(() => normalizeSimulation(files, new Date().toISOString())).toThrow()
    expect(() => resultUrl('../../other')).toThrow()
  })
  it('rejects divergent candidate catalogs, malformed numbers and impossible section counts', () => {
    const invalid = structuredClone(mt)
    invalid.carg[0].agr[0].par[0].cand[0].vap = 'broken'
    expect(() => decodeEa20(invalid, 'mt')).toThrow()
    const files = rawFiles()
    files.set('mt', { ...mt, s: { ts: '2', st: '3' } })
    expect(() => normalizeSimulation(files, new Date().toISOString())).toThrow()
    const divergent = structuredClone(mt)
    divergent.carg[0].agr[0].par[0].cand[0].sqcand = 'unknown'
    files.set('mt', divergent)
    expect(() => normalizeSimulation(files, new Date().toISOString())).toThrow('divergentes')
  })
  it('shares in-flight loads, limits concurrency to four and expires the cache', async () => {
    let now = Date.parse('2026-10-04T18:00:00Z'), active = 0, maxActive = 0
    const fetcher = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      active++; maxActive = Math.max(maxActive, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      const scope = String(input).split('/').at(-2)!
      return new Response(JSON.stringify(scope === 'br' ? br : { ...mt, cdabr: scope }))
    })
    const source = createTseSource({ fetcher: fetcher as typeof fetch, now: () => now })
    const [a, b] = await Promise.all([source.load(), source.load()])
    expect(a).toBe(b)
    expect(fetcher).toHaveBeenCalledTimes(28)
    expect(maxActive).toBe(4)
    await source.load(); expect(fetcher).toHaveBeenCalledTimes(28)
    now += 30_001
    await source.load(); expect(fetcher).toHaveBeenCalledTimes(56)
  })
  it('backs off after an upstream error instead of requesting missing files repeatedly', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 404 }))
    const source = createTseSource({ fetcher })
    await expect(source.load()).rejects.toThrow('HTTP 404')
    const attempts = fetcher.mock.calls.length
    await expect(source.load()).rejects.toThrow('HTTP 404')
    expect(fetcher).toHaveBeenCalledTimes(attempts)
    expect(attempts).toBeLessThanOrEqual(4)
  })
})

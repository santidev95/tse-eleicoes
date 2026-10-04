import { readFileSync } from 'node:fs'
import { describe, it, expect, vi } from 'vitest'
import { GOVERNORS, OFFICIAL, decodeEa20, normalizeTse, resultUrl } from './tse-adapter'
import { createTseSource } from './tse-source'
import { createSupabaseReader } from './supabase-reader'
import { states } from '../src/data/states'
import { resultOverview, snapshotSchema } from '../src/domain/election'
const sp = JSON.parse(readFileSync('tests/fixtures/tse/governor-sp.json', 'utf8'))
const mt = JSON.parse(readFileSync('tests/fixtures/tse/governor-mt.json', 'utf8'))
const files = () =>
  new Map(
    states.map((s) => [
      s.uf.toLowerCase(),
      { ...(s.uf === 'MT' ? mt : sp), cdabr: s.uf.toLowerCase() },
    ]),
  )
describe('governor elections', () => {
  it('keeps 27 independent candidate lists and never invents a national vote count', () => {
    const data = normalizeTse(files(), new Date().toISOString(), GOVERNORS)
    expect(data.office).toBe('governor')
    expect(data.upstream?.files).toHaveLength(27)
    expect(data.national.votes).toEqual([])
    const a = resultOverview(
      data.states.find((s) => s.uf === 'SP')!,
      data.candidates,
    )
    const b = resultOverview(
      data.states.find((s) => s.uf === 'MT')!,
      data.candidates,
    )
    expect(a.ranked.every((c) => c.uf === 'SP')).toBe(true)
    expect(b.ranked.every((c) => c.uf === 'MT')).toBe(true)
    expect(a.leader?.party).toBe('REPUBLICANOS')
    expect(a.leader?.color).toBe(b.leader?.color)
    data.states[0].votes[0].candidateId = data.states[1].votes[0].candidateId
    expect(snapshotSchema.safeParse(data).success).toBe(false)
  })
  it('uses TSE outcome fields, not a majority or the ambiguous elected flag', () => {
    const raw = structuredClone(sp)
    raw.md = 'n'
    raw.esae = 'n'
    raw.carg[0].agr[0].par[0].cand[0].e = 's'
    expect(decodeEa20(raw, 'sp', GOVERNORS).result.outcome).toBe('counting')
    raw.md = 's'
    expect(decodeEa20(raw, 'sp', GOVERNORS).result.outcome).toBe('runoff')
    raw.md = 'e'
    expect(decodeEa20(raw, 'sp', GOVERNORS).result.outcome).toBe('elected')
    delete raw.md
    raw.carg[0].agr[0].par[0].cand[0].st = '2º turno'
    expect(decodeEa20(raw, 'sp', GOVERNORS).result.outcome).toBe('runoff')
    raw.esae = 's'
    expect(decodeEa20(raw, 'sp', GOVERNORS).result.outcome).toBe('unassigned')
    raw.dv = 'n'
    expect(decodeEa20(raw, 'sp', GOVERNORS).result.outcome).toBe('counting')
  })
  it('rejects the wrong election, office, UF, missing files and BR requests', () => {
    expect(() => decodeEa20(sp, 'sp', OFFICIAL)).toThrow()
    expect(() =>
      decodeEa20({ ...sp, carg: [{ ...sp.carg[0], cd: '1' }] }, 'sp', GOVERNORS),
    ).toThrow()
    expect(() => decodeEa20(sp, 'mt', GOVERNORS)).toThrow()
    expect(() => resultUrl('br', GOVERNORS)).toThrow()
    const missing = files()
    missing.delete('df')
    expect(() => normalizeTse(missing, new Date().toISOString(), GOVERNORS)).toThrow()
  })
  it('downloads only 27 state files and isolates Supabase reads by office', async () => {
    const raw = files()
    const fetcher = vi.fn(
      async (url: string | URL | Request) =>
        new Response(JSON.stringify(raw.get(String(url).split('/').at(-2)!))),
    )
    await createTseSource({ config: GOVERNORS, fetcher: fetcher as typeof fetch }).load()
    expect(fetcher).toHaveBeenCalledTimes(27)
    expect(fetcher.mock.calls.every(([url]) => String(url).includes('-c0003-e006259-u.json'))).toBe(
      true,
    )
    const data = normalizeTse(raw, new Date().toISOString(), GOVERNORS)
    const read = vi.fn(async (_url: string | URL | Request) =>
      Response.json([
        { snapshot: data, last_checked_at: new Date().toISOString(), last_error: null },
      ]),
    )
    await createSupabaseReader(
      'https://test.supabase.co',
      'public',
      'oficial',
      read,
      'governor',
    ).load()
    expect(String(read.mock.calls[0]?.[0])).toContain('/tse_governor_latest?')
    await expect(
      createSupabaseReader('https://test.supabase.co', 'public', 'oficial', read).load(),
    ).rejects.toThrow('Cargo')
  })
})

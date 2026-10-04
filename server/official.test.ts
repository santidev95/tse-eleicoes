import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OFFICIAL, SIMULATION, decodeEa20, normalizeTse } from './tse-adapter.ts'
import { createSupabaseReader } from './supabase-reader.ts'
import { states } from '../src/data/states.ts'
import { resultOverview, votingNotice } from '../src/domain/election.ts'

const br = JSON.parse(readFileSync('tests/fixtures/tse/official-br.json', 'utf8'))
const files = () =>
  new Map<string, unknown>([
    ['br', br],
    ...states.map((s) => [s.uf.toLowerCase(), { ...br, tpabr: 'uf', cdabr: s.uf.toLowerCase() }] as [string, unknown]),
  ])
const snapshot = () => normalizeTse(files(), '2026-10-04T20:00:00.000Z', OFFICIAL)
afterEach(() => vi.useRealTimers())

describe('official TSE and persistent snapshot boundary', () => {
  it('accepts the official pre-totalization file without inventing destinations or dates', () => {
    const data = snapshot()
    expect(data.source).toBe('tse')
    expect(data.candidates).toHaveLength(12)
    expect(data.upstream?.electionCode).toBe('6257')
    expect(data.upstream?.files[0].totalizedAt).toBeNull()
    expect(data.national.votes[0].destination).toBeUndefined()
    expect(data.national.disclosureAllowed).toBe(true)
    expect(resultOverview(data.national, data.candidates).leader).toBeNull()
    expect(votingNotice(data.national)).toBe('Aguardando início da apuração')
    expect(() => decodeEa20(br, 'br', SIMULATION)).toThrow('ambiente')
  })
  it('does not show withheld votes as published election totals', () => {
    const withheld = structuredClone(br)
    withheld.dv = 'n'
    withheld.and = 'p'
    withheld.carg[0].agr[0].par[0].cand[0].vap = '100'
    withheld.carg[0].agr[0].par[0].cand[0].pvapn = '90,5'
    const decoded = decodeEa20(withheld, 'br', OFFICIAL)
    expect(decoded.result.votes.every((v) => v.count === 0 && v.percent === 0)).toBe(true)
    expect(votingNotice(decoded.result)).toBe('Votação ainda não divulgada pelo TSE')
  })
  it('distinguishes source date from successful collection time and flags stale stored data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T20:01:00Z'))
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              snapshot: snapshot(),
              last_checked_at: '2026-10-04T20:00:00+00:00',
              last_error: null,
            },
          ]),
        ),
    )
    const reader = createSupabaseReader(
      'https://test.supabase.co',
      'public-key',
      'oficial',
      fetcher,
    )
    expect((await reader.load()).storage?.stale).toBe(false)
    vi.setSystemTime(new Date('2026-10-04T20:04:00Z'))
    const stale = await reader.load()
    expect(stale.storage?.stale).toBe(true)
    expect(stale.updatedAt).toBe('2026-10-03T17:47:37.000Z')
  })
  it('rejects a simulated stored snapshot in the official environment and reports missing collection', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              snapshot: { ...snapshot(), source: 'tse-sim' },
              last_checked_at: new Date().toISOString(),
              last_error: null,
            },
          ]),
        ),
    )
    await expect(
      createSupabaseReader('https://test.supabase.co', 'public-key', 'oficial', fetcher).load(),
    ).rejects.toThrow('Ambiente')
    await expect(
      createSupabaseReader(
        'https://test.supabase.co',
        'public-key',
        'oficial',
        async () => new Response('[]'),
      ).load(),
    ).rejects.toThrow('primeira coleta')
  })
})

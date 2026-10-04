import { z } from 'zod'
import { snapshotSchema } from '../src/domain/election.ts'
import type { ElectionSnapshot } from '../src/domain/election.ts'

export function createSupabaseReader(
  url: string,
  key: string,
  environment: string,
  fetcher = fetch,
) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new Error('URL Supabase inválida.')
  if (!key || !['oficial', 'simulado2026'].includes(environment))
    throw new Error('Configuração Supabase inválida.')
  return {
    async load(): Promise<ElectionSnapshot> {
      const query = new URLSearchParams({
        environment: `eq.${environment}`,
        select: 'snapshot,last_checked_at,last_error',
        limit: '1',
      })
      const response = await fetcher(`${url}/rest/v1/tse_latest?${query}`, {
        headers: { apikey: key, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok)
        throw new Error(`Não foi possível ler a apuração armazenada (HTTP ${response.status}).`)
      const rows = z
        .array(
          z.object({
            snapshot: snapshotSchema,
            last_checked_at: z.string(),
            last_error: z.string().nullable(),
          }),
        )
        .parse(await response.json())
      const row = rows[0]
      if (!row) throw new Error('Aguardando a primeira coleta completa do TSE.')
      if (row.snapshot.source !== (environment === 'oficial' ? 'tse' : 'tse-sim'))
        throw new Error('Ambiente do snapshot incorreto.')
      const checked = new Date(row.last_checked_at)
      if (!Number.isFinite(checked.valueOf())) throw new Error('Data de coleta inválida.')
      return {
        ...row.snapshot,
        storage: {
          lastCheckedAt: checked.toISOString(),
          stale: !!row.last_error || Date.now() - checked.valueOf() > 180_000,
        },
      }
    },
  }
}

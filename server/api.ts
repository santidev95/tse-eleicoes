import type { IncomingMessage, ServerResponse } from 'node:http'
import { createTseSource } from './tse-source.ts'
import { OFFICIAL, SIMULATION, GOVERNORS } from './tse-adapter.ts'
import { createSupabaseReader } from './supabase-reader.ts'

export function createPresidentialApi(env: Record<string, string | undefined> = process.env) {
  const environment = env.TSE_ENVIRONMENT ?? 'oficial'
  const direct = env.TSE_DATA_PROVIDER === 'direct'
  const sources = new Map<string, { load: () => Promise<unknown> }>()
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/tse/presidential' && path !== '/api/tse/governors') return next()
    const office = path.endsWith('governors') ? 'governor' : 'president'
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Método não permitido.' }))
      return
    }
    try {
      if (!['oficial', 'simulado2026'].includes(environment))
        throw new Error('Ambiente TSE inválido.')
      if (office === 'governor' && environment !== 'oficial')
        throw new Error('Governadores disponíveis no ambiente oficial.')
      const source =
        sources.get(office) ??
        (direct
          ? createTseSource({
              config:
                office === 'governor'
                  ? GOVERNORS
                  : environment === 'oficial'
                    ? OFFICIAL
                    : SIMULATION,
            })
          : createSupabaseReader(
              env.SUPABASE_URL ?? '',
              env.SUPABASE_PUBLISHABLE_KEY ?? '',
              environment,
              fetch,
              office,
            ))
      sources.set(office, source)
      res.end(JSON.stringify(await source.load()))
    } catch (error) {
      console.error(
        'Falha na apuração:',
        error instanceof Error ? error.message : 'Erro desconhecido',
      )
      res.statusCode = 503
      res.setHeader('Retry-After', '30')
      res.end(
        JSON.stringify({
          error: 'Não foi possível atualizar a apuração. Tente novamente em instantes.',
        }),
      )
    }
  }
}

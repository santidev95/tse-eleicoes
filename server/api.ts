import type { IncomingMessage, ServerResponse } from 'node:http'
import { createTseSource } from './tse-source.ts'
import { OFFICIAL, SIMULATION } from './tse-adapter.ts'
import { createSupabaseReader } from './supabase-reader.ts'

export function createPresidentialApi(env: Record<string, string | undefined> = process.env) {
  const environment = env.TSE_ENVIRONMENT ?? 'oficial'
  const direct = env.TSE_DATA_PROVIDER === 'direct'
  let source: { load: () => Promise<unknown> } | undefined
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== '/api/tse/presidential') return next()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET'); res.statusCode = 405
      res.end(JSON.stringify({ error: 'Método não permitido.' })); return
    }
    try {
      if (!['oficial', 'simulado2026'].includes(environment)) throw new Error('Ambiente TSE inválido.')
      source ??= direct ? createTseSource({ config: environment === 'oficial' ? OFFICIAL : SIMULATION })
        : createSupabaseReader(env.SUPABASE_URL ?? '', env.SUPABASE_PUBLISHABLE_KEY ?? '', environment)
      res.end(JSON.stringify(await source.load()))
    } catch (error) {
      console.error('Falha na apuração:', error instanceof Error ? error.message : 'Erro desconhecido')
      res.statusCode = 503
      res.setHeader('Retry-After', '30')
      res.end(JSON.stringify({ error: 'Não foi possível atualizar a apuração. Tente novamente em instantes.' }))
    }
  }
}

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createTseSource } from './tse-source.ts'

const source = createTseSource()
export async function presidentialApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (req.url?.split('?')[0] !== '/api/tse/presidential') return next()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Método não permitido.' }))
    return
  }
  try {
    res.end(JSON.stringify(await source.load()))
  } catch (error) {
    console.error(
      'Falha ao consultar o simulado TSE:',
      error instanceof Error ? error.message : 'erro desconhecido',
    )
    res.statusCode = 503
    res.setHeader('Retry-After', '30')
    res.end(
      JSON.stringify({
        error: 'Não foi possível atualizar o simulado do TSE. Tente novamente em instantes.',
      }),
    )
  }
}

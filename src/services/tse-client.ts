import { snapshotSchema } from '../domain/election'
import type { ElectionSnapshot, Office } from '../domain/election'

export class ElectionServiceError extends Error {}

// Browser boundary: the server owns the EA20 adapter, request limits and shared cache.
export async function fetchTseSnapshot(
  url: string,
  signal?: AbortSignal,
  expectedSource: 'tse' | 'tse-sim' = 'tse',
  office: Office = 'president',
): Promise<ElectionSnapshot> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok)
    throw new ElectionServiceError(`A atualização falhou (HTTP ${response.status}).`)
  const parsed = snapshotSchema.safeParse(await response.json())
  if (!parsed.success || parsed.data.source !== expectedSource || parsed.data.office !== office)
    throw new ElectionServiceError('Os dados recebidos não correspondem ao contrato da apuração.')
  return parsed.data
}

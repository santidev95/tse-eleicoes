import { snapshotSchema } from '../domain/election'
import type { ElectionSnapshot } from '../domain/election'

export class ElectionServiceError extends Error {}

// This client consumes YOUR normalized proxy, not an assumed 2026 TSE URL/schema.
// See docs/tse-integration.md for the official-endpoint adapter boundary.
export async function fetchTseSnapshot(
  url: string,
  signal?: AbortSignal,
): Promise<ElectionSnapshot> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok)
    throw new ElectionServiceError(`A atualização falhou (HTTP ${response.status}).`)
  const parsed = snapshotSchema.safeParse(await response.json())
  if (!parsed.success || parsed.data.source !== 'tse')
    throw new ElectionServiceError('Os dados recebidos não correspondem ao contrato da apuração.')
  return parsed.data
}

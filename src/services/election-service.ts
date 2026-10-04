import { createMockSnapshot } from '../data/mock-election'
import { ElectionServiceError, fetchTseSnapshot } from './tse-client'
import type { ElectionSnapshot, Office } from '../domain/election'

export interface ElectionService {
  load(signal?: AbortSignal): Promise<ElectionSnapshot>
  pollInterval: number | null
}
export function createElectionService(
  source = import.meta.env.VITE_ELECTION_DATA_SOURCE ?? 'tse',
  office: Office = 'president',
): ElectionService {
  if (source === 'mock')
    return {
      pollInterval: null,
      async load(signal) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            signal?.removeEventListener('abort', abort)
            resolve()
          }, 350)
          const abort = () => {
            clearTimeout(timer)
            reject(new DOMException('Aborted', 'AbortError'))
          }
          if (signal?.aborted) abort()
          else signal?.addEventListener('abort', abort, { once: true })
        })
        return createMockSnapshot(office)
      },
    }
  if (source !== 'tse' && source !== 'tse-sim')
    return {
      pollInterval: null,
      load: () => Promise.reject(new ElectionServiceError('Fonte de dados inválida.')),
    }
  const url =
    office === 'governor'
      ? '/api/tse/governors'
      : (import.meta.env.VITE_TSE_PROXY_URL ?? '/api/tse/presidential')
  return {
    pollInterval: 30_000,
    load: (signal) => {
      if (!url)
        return Promise.reject(
          new ElectionServiceError('A integração com o TSE ainda não foi configurada.'),
        )
      return fetchTseSnapshot(url, signal, source, office)
    },
  }
}

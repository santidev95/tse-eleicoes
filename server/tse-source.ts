import { states } from '../src/data/states'
import type { ElectionSnapshot } from '../src/domain/election'
import { normalizeSimulation, resultUrl } from './tse-adapter'

export class UpstreamError extends Error {}

export function createTseSource({
  fetcher = fetch, now = Date.now, ttl = 30_000,
}: { fetcher?: typeof fetch; now?: () => number; ttl?: number } = {}) {
  let cache: { value: ElectionSnapshot; expiresAt: number } | null = null
  let inFlight: Promise<ElectionSnapshot> | null = null
  let retryAfter = 0
  let lastError: unknown
  async function download() {
    const scopes = ['br', ...states.map(state => state.uf.toLowerCase())]
    const rawFiles = new Map<string, unknown>()
    let next = 0
    let failed = false
    // Four workers limit both simultaneous connections and pressure on the official host.
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (!failed && next < scopes.length) {
        const scope = scopes[next++]
        try {
          const response = await fetcher(resultUrl(scope), {
            headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
          })
          if (!response.ok) throw new UpstreamError(`TSE indisponível (HTTP ${response.status}).`)
          rawFiles.set(scope, await response.json())
        } catch (error) {
          failed = true
          throw error
        }
      }
    }))
    return normalizeSimulation(rawFiles, new Date(now()).toISOString())
  }
  return {
    async load(): Promise<ElectionSnapshot> {
      if (cache && cache.expiresAt > now()) return cache.value
      if (inFlight) return inFlight
      if (retryAfter > now()) throw lastError
      inFlight = download()
        .then(value => {
          cache = { value, expiresAt: now() + ttl }
          retryAfter = 0
          return value
        })
        .catch(error => {
          // Failed clients cannot hammer missing files. The UI retains its previous result.
          retryAfter = now() + ttl
          lastError = error
          throw error
        })
        .finally(() => { inFlight = null })
      return inFlight
    },
  }
}

import { states } from '../src/data/states.ts'
import type { ElectionSnapshot } from '../src/domain/election.ts'
import { normalizeTse, resultUrl, SIMULATION, isGovernor } from './tse-adapter.ts'
import type { TseConfig } from './tse-adapter.ts'

export class UpstreamError extends Error {
  status: number
  constructor(status: number) {
    super(`TSE indisponível (HTTP ${status}).`)
    this.status = status
  }
}

export function createTseSource({
  fetcher = fetch,
  now = Date.now,
  ttl = 30_000,
  config = SIMULATION,
}: { fetcher?: typeof fetch; now?: () => number; ttl?: number; config?: TseConfig } = {}) {
  let cache: { value: ElectionSnapshot; expiresAt: number } | null = null
  let inFlight: Promise<ElectionSnapshot> | null = null
  let retryAfter = 0
  let lastError: unknown
  let rawCache = new Map<string, { raw: unknown; etag: string | null; modified: string | null }>()
  async function download() {
    const scopes = [...(isGovernor(config) ? [] : ['br']), ...states.map((state) => state.uf.toLowerCase())]
    const rawFiles = new Map<string, unknown>()
    const downloaded = new Map<
      string,
      { raw: unknown; etag: string | null; modified: string | null }
    >()
    let next = 0
    let failed = false
    // Four workers limit both simultaneous connections and pressure on the official host.
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (!failed && next < scopes.length) {
          const scope = scopes[next++]
          try {
            const previous = rawCache.get(scope)
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (previous?.etag) headers['If-None-Match'] = previous.etag
            else if (previous?.modified) headers['If-Modified-Since'] = previous.modified
            const response = await fetcher(resultUrl(scope, config), {
              headers,
              signal: AbortSignal.timeout(15_000),
            })
            if (response.status === 304 && previous) {
              rawFiles.set(scope, previous.raw)
              downloaded.set(scope, previous)
              continue
            }
            if (!response.ok) throw new UpstreamError(response.status)
            const raw = await response.json()
            rawFiles.set(scope, raw)
            downloaded.set(scope, {
              raw,
              etag: response.headers.get('etag'),
              modified: response.headers.get('last-modified'),
            })
          } catch (error) {
            failed = true
            throw error
          }
        }
      }),
    )
    const snapshot = normalizeTse(rawFiles, new Date(now()).toISOString(), config)
    rawCache = downloaded
    return snapshot
  }
  return {
    getRawFiles: () => [...rawCache].map(([scope, file]) => ({ scope, ...file })),
    async load(): Promise<ElectionSnapshot> {
      if (cache && cache.expiresAt > now()) return cache.value
      if (inFlight) return inFlight
      if (retryAfter > now()) throw lastError
      inFlight = download()
        .then((value) => {
          cache = { value, expiresAt: now() + ttl }
          retryAfter = 0
          return value
        })
        .catch((error) => {
          // Failed clients cannot hammer missing files. The UI retains its previous result.
          retryAfter =
            now() +
            (error instanceof UpstreamError && [403, 404, 429].includes(error.status)
              ? 600_000
              : ttl)
          lastError = error
          throw error
        })
        .finally(() => {
          inFlight = null
        })
      return inFlight
    },
  }
}

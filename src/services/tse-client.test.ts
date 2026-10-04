import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSnapshot } from '../data/mock-election'
import { fetchTseSnapshot } from './tse-client'
import { createElectionService } from './election-service'
afterEach(() => vi.unstubAllGlobals())
describe('TSE integration boundary', () => {
  it('validates normalized production payloads and passes cancellation', async () => {
    const payload = { ...createMockSnapshot(), source: 'tse' }
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    expect((await fetchTseSnapshot('/api/tse/presidential', signal)).source).toBe('tse')
    expect(fetch.mock.calls[0][1].signal).toBe(signal)
  })
  it('does not silently turn HTTP errors or mock payloads into official results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    await expect(fetchTseSnapshot('/api/tse/presidential')).rejects.toThrow('HTTP 503')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(createMockSnapshot()))),
    )
    await expect(fetchTseSnapshot('/api/tse/presidential')).rejects.toThrow('contrato')
  })
  it('cancels mock loading when the consumer unmounts', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(createElectionService('mock').load(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

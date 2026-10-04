import { useCallback, useEffect, useState } from 'react'
import { createElectionService } from '../services/election-service'
import type { ElectionSnapshot } from '../domain/election'
import type { ElectionService } from '../services/election-service'

const defaultService = createElectionService()
export function useElection(service: ElectionService = defaultService) {
  const [data, setData] = useState<ElectionSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function load() {
      controller = new AbortController()
      setLoading(true)
      try {
        const next = await service.load(controller.signal)
        if (active) {
          setData(next)
          setError(null)
        }
      } catch (err) {
        if (active && !(err instanceof DOMException && err.name === 'AbortError'))
          setError(err instanceof Error ? err.message : 'Não foi possível carregar a apuração.')
      } finally {
        if (active) {
          setLoading(false)
          if (service.pollInterval)
            timer = setTimeout(() => {
              void load()
            }, service.pollInterval)
        }
      }
    }
    void load()
    return () => {
      active = false
      controller?.abort()
      clearTimeout(timer)
    }
  }, [service, attempt])
  return { data, error, loading, retry }
}

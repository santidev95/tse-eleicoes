import type { ElectionSnapshot } from '../domain/election'
export function Header({
  data,
  loading,
  stale,
  onSearch,
}: {
  data: ElectionSnapshot | null
  loading: boolean
  stale: boolean
  onSearch: () => void
}) {
  const mock = !data || data.source === 'mock'
  const time = data
    ? new Date(data.updatedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
    : null
  return (
    <header className="header">
      <div className="brand-context">
        <h1>
          <span className="dot brand-dot" />
          Eleições 2026
        </h1>
        <span className="header-subtitle">
          Apuração presidencial{mock ? ' · demonstração' : ' em tempo real'}
        </span>
        <span className="source-badge">
          <img src="/design/badge.svg" alt="" width="11.9167" height="11.375" />
          {mock ? 'Dados simulados' : 'Fonte: TSE'}
        </span>
      </div>
      <div className="header-actions">
        <span className={`live-badge ${stale ? 'is-stale' : ''}`}>
          <span className="dot" />
          <span className="mono">
            {stale ? 'SEM ATUALIZAÇÃO' : mock ? 'DEMONSTRAÇÃO' : 'AO VIVO'}
          </span>
          <span className="updated-at">
            {loading ? 'Carregando…' : time ? `${time} BRT` : 'Aguardando dados'}
          </span>
        </span>
        <button
          className="search-trigger"
          onClick={onSearch}
          aria-label="Buscar estado"
          disabled={!data}
        >
          <img src="/design/search.svg" alt="" width="12" height="12" />
          <span>Buscar UF</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    </header>
  )
}

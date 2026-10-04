import type { ElectionSnapshot, Office } from '../domain/election'
import { OfficeSelector } from './OfficeSelector'
export function Header({
  data,
  loading,
  stale,
  onSearch,
  office,
  onOfficeChange,
}: {
  data: ElectionSnapshot | null
  loading: boolean
  stale: boolean
  onSearch: () => void
  office: Office
  onOfficeChange: (office: Office) => void
}) {
  const mock = data?.source === 'mock'
  const simulation = data?.source === 'tse-sim'
  const time = data
    ? new Date(data.updatedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
    : null
  const date = data
    ? new Date(data.updatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
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
          Apuração {office === 'president' ? 'presidencial' : 'estadual'}{mock ? ' · demonstração' : simulation ? ' · simulado' : ''}
        </span>
        <span className="source-badge">
          <img src={office === 'governor' ? '/design/governors/badge.svg' : '/design/badge.svg'} alt="" width="11.9167" height="11.375" />
          {!data
            ? 'Aguardando dados'
            : mock
              ? 'Dados simulados'
              : simulation
                ? 'Simulado TSE'
                : 'Fonte: TSE'}
        </span>
      </div>
      <OfficeSelector office={office} onChange={onOfficeChange} />
      <div className="header-actions">
        <span className={`live-badge ${stale ? 'is-stale' : ''}`}>
          <span className="dot" />
          <span className="mono">
            {stale
              ? 'SEM ATUALIZAÇÃO'
              : !data
                ? 'CARREGANDO'
                : mock
                  ? 'DEMONSTRAÇÃO'
                  : simulation
                    ? 'SIMULADO'
                    : data.national.totalizationStatus === 'not-started'
                      ? 'AGUARDANDO'
                      : data.national.totalizationStatus === 'completed'
                        ? 'TOTALIZADO'
                        : 'TSE'}
          </span>
          <span
            className={`updated-at ${data && !mock ? 'simulation-date' : ''}`}
            title={office === 'president' ? 'Data de geração do arquivo nacional · horário de Brasília' : 'Arquivo estadual mais recente · horário de Brasília; cada UF tem sua própria atualização'}
          >
            {loading ? 'Carregando…' : time ? `${date} · ${time} BRT` : 'Aguardando dados'}
          </span>
        </span>
        <button
          className="search-trigger"
          onClick={onSearch}
          aria-label="Buscar estado"
          disabled={!data}
        >
          <img src={office === 'governor' ? '/design/governors/search.svg' : '/design/search.svg'} alt="" width="12" height="12" />
          <span>Buscar UF</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    </header>
  )
}

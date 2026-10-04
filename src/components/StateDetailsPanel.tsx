import { useEffect, useRef } from 'react'
import { stateByUf } from '../data/states'
import {
  countedPercent,
  formatMargin,
  formatNumber,
  formatPercent,
  resultOverview,
} from '../domain/election'
import type { Candidate, StateResult } from '../domain/election'
export function StateDetailsPanel({
  result,
  candidates,
  round,
  mock,
  onClose,
}: {
  result: StateResult
  candidates: Candidate[]
  round: 1 | 2
  mock: boolean
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const state = stateByUf[result.uf]
  const { ranked, leader, noVotes, margin } = resultOverview(result, candidates)
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
  }, [result.uf])
  return (
    <aside className="state-panel" aria-labelledby="state-panel-title">
      <div className="panel-header">
        <span className="uf-badge">{state.uf}</span>
        <div>
          <span className="eyebrow">{state.region}</span>
          <h2 id="state-panel-title">{state.name}</h2>
        </div>
        <button
          ref={closeRef}
          className="close-button"
          onClick={onClose}
          aria-label="Fechar detalhes do estado"
        >
          ×
        </button>
      </div>
      <p className="state-leader">
        {noVotes
          ? 'Aguardando votos'
          : leader
            ? `${leader.name} lidera`
            : 'Empate entre os primeiros'}
      </p>
      <div className="panel-counted">
        <strong className="mono">{formatPercent(countedPercent(result), 1)}</strong>
        <span>das seções apuradas</span>
      </div>
      <p className="sections-detail">
        {formatNumber(result.sectionsCounted)} de {formatNumber(result.sectionsTotal)} seções
      </p>
      <ul className="panel-candidates">
        {ranked.map((candidate) => (
          <li key={candidate.id}>
            <span className="dot" style={{ background: candidate.color }} />
            <div>
              <span>{candidate.name}</span>
              <small>{formatNumber(candidate.votes)} votos</small>
            </div>
            <strong className="mono">{formatPercent(candidate.percent, 1)}</strong>
          </li>
        ))}
      </ul>
      <div className="panel-margin">
        <span>Diferença entre os primeiros</span>
        <strong className="mono">
          {noVotes ? 'Sem votos' : leader ? formatMargin(margin) : 'Empate'}
        </strong>
      </div>
      <p className="panel-footnote">
        Presidente da República · {round}º turno{mock ? ' · simulação' : ''}
      </p>
    </aside>
  )
}

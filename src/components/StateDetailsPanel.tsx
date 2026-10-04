import { useEffect, useRef } from 'react'
import { stateByUf } from '../data/states'
import {
  countedPercent,
  formatMargin,
  formatNumber,
  formatPercent,
  resultOverview,
  votingNotice,
} from '../domain/election'
import type { Candidate, StateResult, Office } from '../domain/election'
export function StateDetailsPanel({
  result,
  candidates,
  round,
  mock,
  onClose,
  office = 'president',
}: {
  result: StateResult
  candidates: Candidate[]
  round: 1 | 2
  mock: boolean
  onClose: () => void
  office?: Office
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
          ? (votingNotice(result) ?? 'Aguardando votos')
          : leader
            ? `${leader.name} · mais votos computados`
            : 'Empate entre os primeiros'}
      </p>
      {office === 'governor' && <p className="state-outcome">{result.outcome === 'elected' ? 'Eleito no 1º turno · TSE' : result.outcome === 'runoff' ? 'Segundo turno definido · TSE' : result.outcome === 'unassigned' ? 'Sem atribuição de eleito · TSE' : 'Em apuração · resultado ainda não definido'}</p>}
      <div className="panel-counted">
        <strong className="mono">{formatPercent(countedPercent(result), 1)}</strong>
        <span>das seções {result.sectionMetric === 'totalized' ? 'totalizadas' : 'apuradas'}</span>
      </div>
      <p className="sections-detail">
        {formatNumber(result.sectionsCounted)} de {formatNumber(result.sectionsTotal)} seções
      </p>
      {!noVotes && (
        <ul className="panel-candidates">
          {ranked.slice(0, 3).map((candidate) => (
            <li key={candidate.id}>
              <span className="dot" style={{ background: candidate.color }} />
              <div>
                <span>{candidate.name}{candidate.party ? ` · ${candidate.party}` : ''}</span>
                {candidate.status && <small>{candidate.status}</small>}
                <small>{formatNumber(candidate.votes)} votos</small>
                {candidate.destination && candidate.destination !== 'Válido' && (
                  <small className="vote-destination">{candidate.destination}</small>
                )}
              </div>
              <strong className="mono">{formatPercent(candidate.percent, 1)}</strong>
            </li>
          ))}
        </ul>
      )}
      {!noVotes && ranked.length > 3 && (
        <details className="other-candidates">
          <summary>Outros {ranked.length - 3} candidatos</summary>
          <ul className="panel-candidates">
            {ranked.slice(3).map((candidate) => (
              <li key={candidate.id}>
                <span className="dot" style={{ background: candidate.color }} />
                <div>
                  <span>{candidate.name}{candidate.party ? ` · ${candidate.party}` : ''}</span>
                  {candidate.status && <small>{candidate.status}</small>}
                  <small>{formatNumber(candidate.votes)} votos</small>
                  {candidate.destination && candidate.destination !== 'Válido' && (
                    <small className="vote-destination">{candidate.destination}</small>
                  )}
                </div>
                <strong className="mono">{formatPercent(candidate.percent, 1)}</strong>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!noVotes && (
        <div className="panel-margin">
          <span>Diferença entre os primeiros</span>
          <strong className="mono">
            {noVotes ? 'Sem votos' : leader ? formatMargin(margin) : 'Empate'}
          </strong>
        </div>
      )}
      <p className="panel-footnote">
        {office === 'president' ? 'Presidente da República' : 'Governador'} · {round}º turno
        {mock ? ' · simulação' : ' · percentuais e destinação conforme TSE'}
      </p>
    </aside>
  )
}

import { stateByUf } from '../data/states'
import { countedPercent, formatMargin, formatPercent, resultOverview } from '../domain/election'
import type { Candidate, StateResult } from '../domain/election'
export interface HoverTarget {
  uf: StateResult['uf']
  x: number
  y: number
}
export function StateTooltip({
  result,
  candidates,
  position,
}: {
  result: StateResult
  candidates: Candidate[]
  position: HoverTarget
}) {
  const state = stateByUf[result.uf]
  const { ranked, leader, noVotes, margin } = resultOverview(result, candidates)
  const x = Math.max(12, Math.min(position.x + 18, window.innerWidth - 256))
  const y = Math.max(12, Math.min(position.y + 16, window.innerHeight - 220))
  return (
    <div className="state-tooltip" id="state-tooltip" role="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-heading">
        <strong>{state.name}</strong>
        <span>{state.uf}</span>
      </div>
      <p className="tooltip-counted">
        <strong className="mono">{formatPercent(countedPercent(result), 1)}</strong> apurado
      </p>
      <div className="tooltip-candidates">
        {ranked.slice(0, 2).map((candidate) => (
          <div key={candidate.id}>
            <span>
              <i className="dot" style={{ background: candidate.color }} />
              {candidate.name}
            </span>
            <strong className="mono">{formatPercent(candidate.percent, 1)}</strong>
          </div>
        ))}
      </div>
      <div className="tooltip-margin">
        <span>Diferença</span>
        <strong className="mono">
          {noVotes ? 'Sem votos' : leader ? formatMargin(margin) : 'Empate'}
        </strong>
      </div>
      <p className="tooltip-hint">Clique para explorar o estado</p>
    </div>
  )
}

import { stateByUf } from '../data/states'
import { useLayoutEffect, useRef, useState } from 'react'
import {
  candidateLabel,
  countedPercent,
  formatMargin,
  formatPercent,
  resultOverview,
  votingNotice,
} from '../domain/election'
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
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(360)
  useLayoutEffect(() => { setHeight(ref.current?.getBoundingClientRect().height ?? 360) }, [result, candidates])
  const x = Math.max(12, Math.min(position.x + 18, window.innerWidth - 296))
  const y = Math.max(12, Math.min(position.y + 16, window.innerHeight - height - 12))
  return (
    <div ref={ref} className="state-tooltip" id="state-tooltip" role="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-heading">
        <strong>{state.name}</strong>
        <span>{state.uf}</span>
      </div>
      <p className="tooltip-counted">
        <strong className="mono">{formatPercent(countedPercent(result), 1)}</strong>{' '}
        {result.sectionMetric === 'totalized' ? 'totalizado' : 'apurado'}
      </p>
      {noVotes ? (
        <p className="tooltip-hint">{votingNotice(result) ?? 'Aguardando votos'}</p>
      ) : (
        <div className="tooltip-candidates">
          {ranked.slice(0, 4).map((candidate) => (
            <div key={candidate.id}>
              <span title={candidate.name}>
                <i className="dot" style={{ background: candidate.color }} />
                {candidateLabel(candidate)}{candidate.party ? ` · ${candidate.party}` : ''}
              </span>
              <strong className="mono">{formatPercent(candidate.percent, 1)}</strong>
            </div>
          ))}
        </div>
      )}
      {!noVotes && ranked[0]?.destination && ranked[0].destination !== 'Válido' && (
        <p className="tooltip-destination">{ranked[0].destination}</p>
      )}
      {!noVotes && (
        <div className="tooltip-margin">
          <span>Diferença</span>
          <strong className="mono">
            {noVotes ? 'Sem votos' : leader ? formatMargin(margin) : 'Empate'}
          </strong>
        </div>
      )}
      <p className="tooltip-hint">Clique para explorar o estado</p>
    </div>
  )
}

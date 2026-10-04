import { candidateLabel, resultOverview } from '../domain/election'
import type { ElectionSnapshot, MapMode } from '../domain/election'
export function MapLegend({ data, mode }: { data: ElectionSnapshot; mode: MapMode }) {
  const counts = new Map<string, number>()
  let neutral = 0
  for (const state of data.states) {
    const leader = resultOverview(state, data.candidates).leader
    if (leader) counts.set(leader.id, (counts.get(leader.id) ?? 0) + 1)
    else neutral++
  }
  const leaders = data.candidates
    .filter((c) => counts.has(c.id))
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
  const others = leaders.slice(2)
  return (
    <div className="map-legend" aria-label="Legenda do mapa">
      <p className="eyebrow">
        {mode === 'counted'
          ? data.national.sectionMetric === 'totalized'
            ? 'SEÇÕES TOTALIZADAS'
            : 'SEÇÕES APURADAS'
          : mode === 'margin'
            ? 'DIFERENÇA ENTRE OS PRIMEIROS'
            : 'TOTALIZAÇÃO POR ESTADO'}
      </p>
      {mode === 'counted' ? (
        <div className="scale-legend">
          <span>0%</span>
          <i className="counted-scale" />
          <span>100%</span>
        </div>
      ) : (
        <>
          <div className="leader-legend">
            {leaders.slice(0, 2).map((candidate) => (
              <span key={candidate.id} title={candidate.name}>
                <i className="dot" style={{ background: candidate.color }} />
                {candidateLabel(candidate)}:{' '}
                <strong className="mono">{counts.get(candidate.id)} UFs</strong>
              </span>
            ))}
            {others.length > 0 && (
              <span title={others.map((c) => `${c.name}: ${counts.get(c.id)} UFs`).join('\n')}>
                <i className="dot other-leaders" />
                Outros: {others.reduce((n, c) => n + (counts.get(c.id) ?? 0), 0)} UFs
                <span className="sr-only">
                  {others.map((c) => `${candidateLabel(c)}: ${counts.get(c.id)} UFs`).join('; ')}
                </span>
              </span>
            )}
            {neutral > 0 && (
              <span>
                <i className="dot" style={{ background: '#526071' }} />
                Empate / sem votos: {neutral}
              </span>
            )}
          </div>
          {mode === 'margin' && (
            <p className="legend-note">Mais intensidade = maior diferença · até 35 p.p.</p>
          )}
        </>
      )}
    </div>
  )
}

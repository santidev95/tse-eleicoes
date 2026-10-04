import { resultOverview } from '../domain/election'
import type { ElectionSnapshot, MapMode } from '../domain/election'
export function MapLegend({ data, mode }: { data: ElectionSnapshot; mode: MapMode }) {
  const counts = new Map<string, number>()
  let neutral = 0
  for (const state of data.states) {
    const leader = resultOverview(state, data.candidates).leader
    if (leader) counts.set(leader.id, (counts.get(leader.id) ?? 0) + 1)
    else neutral++
  }
  return (
    <div className="map-legend" aria-label="Legenda do mapa">
      <p className="eyebrow">
        {mode === 'counted'
          ? 'SEÇÕES APURADAS'
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
            {data.candidates
              .filter((candidate) => counts.has(candidate.id))
              .map((candidate) => (
                <span key={candidate.id}>
                  <i className="dot" style={{ background: candidate.color }} />
                  {candidate.name}: <strong className="mono">{counts.get(candidate.id)} UFs</strong>
                </span>
              ))}
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

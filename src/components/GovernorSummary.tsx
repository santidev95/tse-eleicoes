import { countedPercent, formatPercent, formatMargin, resultOverview } from '../domain/election'
import type { ElectionSnapshot } from '../domain/election'
import type { UF } from '../data/states'

export function GovernorSummary({
  data,
  onSelect,
}: {
  data: ElectionSnapshot
  onSelect: (uf: UF) => void
}) {
  const elected = data.states.filter((s) => s.outcome === 'elected').length
  const runoff = data.states.filter((s) => s.outcome === 'runoff').length
  const unassigned = data.states.filter((s) => s.outcome === 'unassigned').length
  const closest = data.states
    .map((s) => ({ ...resultOverview(s, data.candidates), uf: s.uf, outcome: s.outcome }))
    .filter((s) => !s.noVotes && s.outcome === 'counting')
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 3)
  return (
    <section
      className="national-summary governor-summary"
      aria-label="Resumo das disputas estaduais"
    >
      <div className="governor-summary-row">
        <strong className="round-label mono">27 DISPUTAS ESTADUAIS</strong>
        <i className="separator-dot" />
        <span title="Média aritmética do percentual de seções totalizadas nas 27 UFs">
          {formatPercent(data.states.reduce((n, s) => n + countedPercent(s), 0) / 27, 1)} apuração
          média
        </span>
        <i className="separator-dot" />
        <span className="outcome-elected">{elected} eleitos no 1º turno</span>
        <span>·</span>
        <span className="outcome-runoff">{runoff} com 2º turno</span>
        <span>·</span>
        <span>{27 - elected - runoff - unassigned} em apuração</span>
        {unassigned > 0 && <span>{unassigned} sem atribuição de eleito</span>}
      </div>
      <div className="closest-races">
        <span className="mono">MAIS DISPUTADOS:</span>
        {closest.length ? (
          closest.map((s) => (
            <button key={s.uf} onClick={() => onSelect(s.uf)} aria-label={`Ver disputa de ${s.uf}`}>
              {s.uf} <strong>({s.tied ? 'empate' : `+${formatMargin(s.margin)}`})</strong>
            </button>
          ))
        ) : (
          <span>Aguardando disputas com votos divulgados</span>
        )}
      </div>
    </section>
  )
}

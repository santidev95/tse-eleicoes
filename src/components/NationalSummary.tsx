import {
  countedPercent,
  formatMargin,
  formatNumber,
  formatPercent,
  resultOverview,
} from '../domain/election'
import type { ElectionSnapshot } from '../domain/election'
export function NationalSummary({ data }: { data: ElectionSnapshot }) {
  const { first, second, leader, noVotes, margin } = resultOverview(data.national, data.candidates)
  return (
    <section className="national-summary" aria-label="Resumo nacional da apuração presidencial">
      <div className="national-progress">
        <span className="round-label">{data.round}º TURNO</span>
        <span className="separator-dot" />
        <strong className="mono">{formatPercent(countedPercent(data.national))}</strong>
        <span className="counted-caption">
          apurado{' '}
          <span className="section-count">
            ({formatNumber(data.national.sectionsCounted)} seções)
          </span>
        </span>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${countedPercent(data.national)}%` }} />
        </div>
      </div>
      <div className="national-candidates">
        {[first, second].filter(Boolean).map((candidate, index) => (
          <div className="summary-candidate-wrap" key={candidate.id}>
            {index === 1 && (
              <span className="versus mono" aria-hidden="true">
                vs
              </span>
            )}
            <div className="summary-candidate">
              <span
                className="dot candidate-dot"
                style={{ background: candidate.color, color: candidate.color }}
              />
              <span className="candidate-short">
                Cand. {candidate.name.replace('Candidato ', '')} ({candidate.number})
              </span>
              <strong className="mono">{formatPercent(candidate.percent)}</strong>
            </div>
          </div>
        ))}
        <div className="national-margin">
          <span>DIFERENÇA</span>
          <strong
            className="mono"
            style={{
              color:
                leader?.color === '#e11d48'
                  ? '#fb7185'
                  : leader?.color === '#2563eb'
                    ? '#93b4ff'
                    : '#cbd5e1',
            }}
          >
            {noVotes ? 'Sem votos' : leader ? `+${formatMargin(margin)}` : 'Empate'}
          </strong>
        </div>
      </div>
    </section>
  )
}

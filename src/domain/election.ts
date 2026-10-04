import { z } from 'zod'
import { states } from '../data/states.ts'

const count = z.number().int().nonnegative()
export const candidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1).optional(),
  number: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
export const resultSchema = z
  .object({
    sectionsTotal: count,
    sectionsCounted: count,
    sectionMetric: z.enum(['counted', 'totalized']).optional(),
    disclosureAllowed: z.boolean().optional(),
    totalizationStatus: z.enum(['not-started', 'partial', 'completed']).optional(),
    votes: z.array(
      z.object({
        candidateId: z.string(),
        count,
        percent: z.number().min(0).max(100).optional(),
        destination: z.string().optional(),
        status: z.string().optional(),
      }),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.sectionsCounted > value.sectionsTotal)
      ctx.addIssue({ code: 'custom', message: 'Seções apuradas excedem o total.' })
    if (new Set(value.votes.map((v) => v.candidateId)).size !== value.votes.length)
      ctx.addIssue({ code: 'custom', message: 'Candidato duplicado.' })
  })
export const snapshotSchema = z
  .object({
    year: z.literal(2026),
    office: z.literal('president'),
    round: z.union([z.literal(1), z.literal(2)]),
    source: z.enum(['mock', 'tse', 'tse-sim']),
    updatedAt: z.iso.datetime(),
    storage: z.object({ lastCheckedAt: z.iso.datetime(), stale: z.boolean() }).optional(),
    upstream: z
      .object({
        electionCode: z.string(),
        environment: z.string(),
        fetchedAt: z.iso.datetime(),
        files: z
          .array(
            z.object({
              scope: z.string(),
              url: z.url(),
              generationId: z.string(),
              generatedAt: z.iso.datetime(),
              totalizedAt: z.iso.datetime().nullable(),
            }),
          )
          .length(28),
      })
      .optional(),
    candidates: z.array(candidateSchema).min(2),
    national: resultSchema,
    states: z
      .array(resultSchema.safeExtend({ uf: z.enum(states.map((state) => state.uf)) }))
      .length(27),
  })
  .superRefine((snapshot, ctx) => {
    const ids = new Set(snapshot.candidates.map((candidate) => candidate.id))
    if (ids.size !== snapshot.candidates.length)
      ctx.addIssue({ code: 'custom', message: 'Identificadores de candidatos duplicados.' })
    if (new Set(snapshot.states.map((state) => state.uf)).size !== 27)
      ctx.addIssue({ code: 'custom', message: 'As 27 UFs devem aparecer uma única vez.' })
    for (const result of [snapshot.national, ...snapshot.states]) {
      if (result.votes.some((v) => !ids.has(v.candidateId)))
        ctx.addIssue({ code: 'custom', message: 'Candidato desconhecido.' })
    }
  })

export type Candidate = z.infer<typeof candidateSchema>
export type ElectionResult = z.infer<typeof resultSchema>
export type ElectionSnapshot = z.infer<typeof snapshotSchema>
export type StateResult = ElectionSnapshot['states'][number]
export type MapMode = 'leader' | 'margin' | 'counted'

export function countedPercent(result: ElectionResult) {
  return result.sectionsTotal === 0 ? 0 : (result.sectionsCounted / result.sectionsTotal) * 100
}
export function rankedResults(result: ElectionResult, candidates: Candidate[]) {
  const hidden = result.disclosureAllowed === false || result.totalizationStatus === 'not-started'
  const total = result.votes.reduce((sum, vote) => sum + vote.count, 0)
  return candidates
    .map((candidate) => {
      const vote = result.votes.find((vote) => vote.candidateId === candidate.id)
      const votes = hidden ? 0 : (vote?.count ?? 0)
      return {
        ...candidate,
        votes,
        percent: hidden ? 0 : (vote?.percent ?? (total === 0 ? 0 : (votes / total) * 100)),
        destination: vote?.destination,
        status: vote?.status,
      }
    })
    .sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id))
}
export function votingNotice(result: ElectionResult) {
  if (result.disclosureAllowed === false) return 'Votação ainda não divulgada pelo TSE'
  if (result.totalizationStatus === 'not-started') return 'Aguardando início da apuração'
  return null
}
export function resultOverview(result: ElectionResult, candidates: Candidate[]) {
  const ranked = rankedResults(result, candidates)
  const [first, second] = ranked
  const noVotes = ranked.every((candidate) => candidate.votes === 0)
  const tied = !!first && !!second && first.votes === second.votes
  return {
    ranked,
    first,
    second,
    leader: noVotes || tied ? null : first,
    noVotes,
    tied,
    margin: first && second ? first.percent - second.percent : 0,
  }
}

export const formatPercent = (value: number, digits = 2) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
export const formatNumber = (value: number) => value.toLocaleString('pt-BR')
export const candidateLabel = (candidate: Candidate) =>
  candidate.shortName ?? candidate.name.replace(/^Candidato /i, 'Cand. ')
export const formatMargin = (value: number) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`

export function mapColor(result: ElectionResult, candidates: Candidate[], mode: MapMode) {
  const overview = resultOverview(result, candidates)
  if (mode === 'counted') return mixColor('#19252c', '#0d9488', countedPercent(result) / 100)
  if (!overview.leader) return '#526071'
  if (mode === 'leader') return overview.leader.color
  return mixColor('#292e39', overview.leader.color, Math.min(1, overview.margin / 35))
}
function mixColor(start: string, end: string, ratio: number) {
  const rgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  const a = rgb(start),
    b = rgb(end)
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

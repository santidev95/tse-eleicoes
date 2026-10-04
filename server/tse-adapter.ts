import { z } from 'zod'
import { snapshotSchema } from '../src/domain/election.ts'
import type { Candidate, ElectionResult, ElectionSnapshot } from '../src/domain/election.ts'
import { states } from '../src/data/states.ts'

// Verified on the TSE technical page. Never infer a production election from these codes.
export const SIMULATION = {
  baseUrl: 'https://resultados-sim.tse.jus.br/simulado/simulado2026',
  cycle: 'ele2026',
  electionCode: '21270',
  round: 1,
  environment: 'simulado2026',
  phase: 's',
  source: 'tse-sim',
} as const
export const OFFICIAL = {
  baseUrl: 'https://resultados.tse.jus.br/oficial',
  cycle: 'ele2026',
  electionCode: '6257',
  round: 1,
  environment: 'oficial',
  phase: 'o',
  source: 'tse',
} as const
export const GOVERNORS = {
  ...OFFICIAL,
  electionCode: '6259',
  office: 'governor',
  cargo: '3',
} as const
export type TseConfig = typeof SIMULATION | typeof OFFICIAL | typeof GOVERNORS
export const isGovernor = (config: TseConfig) => 'office' in config && config.office === 'governor'
export const resultUrl = (scope: string, config: TseConfig = SIMULATION) => {
  if (scope !== 'br' && !states.some((state) => state.uf.toLowerCase() === scope))
    throw new Error('Abrangência inválida.')
  if (isGovernor(config) && scope === 'br') throw new Error('Governador não tem arquivo BR.')
  return `${config.baseUrl}/${config.cycle}/${config.electionCode}/dados/${scope}/${scope}-c${isGovernor(config) ? '0003' : '0001'}-e${config.electionCode.padStart(6, '0')}-u.json`
}

const integer = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
const decimal = z
  .string()
  .regex(/^\d+(?:,\d+)?$/)
  .transform((value) => Number(value.replace(',', '.')))
  .pipe(z.number().min(0).max(100))
const candidateSchema = z.object({
  n: z.string().min(1),
  sqcand: z.string().min(1),
  nm: z.string().min(1),
  nmu: z.string().min(1),
  vap: integer,
  pvapn: decimal,
  dvt: z.string().optional(),
  st: z.string(),
})
const ea20Schema = z.object({
  ele: z.string(),
  t: z.literal('1'),
  f: z.enum(['s', 'o']),
  dv: z.enum(['s', 'n']),
  and: z.enum(['n', 'p', 'f']),
  md: z.enum(['e', 's', 'n']).optional(),
  esae: z.enum(['s', 'n']).optional(),
  cdabr: z.string(),
  tpabr: z.enum(['br', 'uf']),
  dg: z.string(),
  hg: z.string(),
  dt: z.string(),
  ht: z.string(),
  idg: z.string().min(1),
  s: z.object({ ts: integer, st: integer }),
  carg: z.array(
    z.object({
      cd: z.string(),
      agr: z.array(
        z.object({
          par: z.array(z.object({ sg: z.string().optional(), cand: z.array(candidateSchema) })),
        }),
      ),
    }),
  ),
})
const palette = [
  '#e11d48',
  '#0d9488',
  '#a855f7',
  '#c084fc',
  '#d97706',
  '#db2777',
  '#65a30d',
  '#0891b2',
  '#4f46e5',
  '#c2410c',
  '#059669',
  '#64748b',
  '#2563eb',
]

export function tseTimestamp(date: string, time: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
  if (!match || !/^\d{2}:\d{2}:\d{2}$/.test(time)) throw new Error('Data TSE inválida.')
  // EA20 generation/totalization timestamps are interpreted in Brasília (UTC-03).
  const iso = `${match[3]}-${match[2]}-${match[1]}T${time}-03:00`
  const timestamp = new Date(iso)
  if (!Number.isFinite(timestamp.valueOf())) throw new Error('Data TSE inválida.')
  return timestamp.toISOString()
}

export function decodeEa20(raw: unknown, scope: string, config: TseConfig = SIMULATION) {
  const file = ea20Schema.parse(raw)
  if (file.ele !== config.electionCode || file.f !== config.phase)
    throw new Error('Eleição ou ambiente TSE não corresponde à configuração.')
  if (file.cdabr !== scope || file.tpabr !== (scope === 'br' ? 'br' : 'uf'))
    throw new Error('Abrangência do arquivo TSE não corresponde à solicitação.')
  const offices = file.carg.filter((office) => office.cd === (isGovernor(config) ? '3' : '1'))
  if (offices.length !== 1) throw new Error('Arquivo não contém o cargo solicitado.')
  const candidates = offices[0].agr.flatMap((group) =>
    group.par.flatMap((party) => party.cand.map((c) => ({ ...c, party: party.sg }))),
  )
  if (candidates.length < 2 || new Set(candidates.map((c) => c.sqcand)).size !== candidates.length)
    throw new Error('Lista de candidatos TSE inválida.')
  const result: ElectionResult = {
    sectionsTotal: file.s.ts,
    sectionsCounted: file.s.st,
    sectionMetric: 'totalized',
    disclosureAllowed: file.dv === 's',
    totalizationStatus:
      file.and === 'n' ? 'not-started' : file.and === 'p' ? 'partial' : 'completed',
    outcome:
      file.dv === 'n' || file.and === 'n'
        ? 'counting'
        : file.esae === 's'
          ? 'unassigned'
          : file.md === 's' || candidates.some((c) => c.st === '2º turno')
            ? 'runoff'
            : file.md === 'e' || candidates.some((c) => c.st === 'Eleito')
              ? 'elected'
              : 'counting',
    votes: candidates.map((c) => ({
      candidateId: c.sqcand,
      count: file.dv === 's' ? c.vap : 0,
      percent: file.dv === 's' ? c.pvapn : 0,
      destination: c.dvt,
      status: c.st,
    })),
  }
  return {
    result,
    candidates,
    metadata: {
      scope: scope.toUpperCase(),
      url: resultUrl(scope, config),
      generationId: file.idg,
      generatedAt: tseTimestamp(file.dg, file.hg),
      totalizedAt: !file.dt && !file.ht ? null : tseTimestamp(file.dt, file.ht),
    },
  }
}

export function normalizeTse(
  rawFiles: Map<string, unknown>,
  fetchedAt: string,
  config: TseConfig,
): ElectionSnapshot {
  if (isGovernor(config)) return normalizeGovernors(rawFiles, fetchedAt, config)
  const national = decodeEa20(rawFiles.get('br'), 'br', config)
  const candidates: Candidate[] = [...national.candidates]
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map((c, i) => ({
      id: c.sqcand,
      name: c.nmu,
      number: c.n,
      // Compact labels prevent the intentionally long names in the simulation breaking the layout.
      shortName: config.phase === 's' ? `Cand. ${c.n}` : c.nmu,
      color: palette[i % palette.length],
    }))
  const files = [national.metadata]
  const regional = states.map((state) => {
    const parsed = decodeEa20(rawFiles.get(state.uf.toLowerCase()), state.uf.toLowerCase(), config)
    const localIds = parsed.candidates.map((c) => c.sqcand)
    if (localIds.length !== candidates.length || candidates.some((c) => !localIds.includes(c.id)))
      throw new Error(`Candidatos divergentes em ${state.uf}.`)
    files.push(parsed.metadata)
    return { ...parsed.result, uf: state.uf }
  })
  // BR is authoritative and includes overseas votes. It must not be replaced by a UF sum.
  return snapshotSchema.parse({
    year: 2026,
    office: 'president',
    round: 1,
    source: config.source,
    updatedAt: national.metadata.generatedAt,
    candidates,
    national: national.result,
    states: regional,
    upstream: {
      electionCode: config.electionCode,
      environment: config.environment,
      fetchedAt,
      files,
    },
  })
}
export const normalizeSimulation = (files: Map<string, unknown>, fetchedAt: string) =>
  normalizeTse(files, fetchedAt, SIMULATION)

export const partyColors: Record<string, string> = {
  PSD: '#3b82f6',
  UNIÃO: '#06b6d4',
  PT: '#ef4444',
  MDB: '#f59e0b',
  PL: '#10b981',
  REPUBLICANOS: '#8b5cf6',
  PP: '#6366f1',
  PSB: '#ec4899',
  PDT: '#f97316',
  PSDB: '#eab308',
  NOVO: '#fb923c',
  PSOL: '#a855f7',
}
function normalizeGovernors(rawFiles: Map<string, unknown>, fetchedAt: string, config: TseConfig) {
  const candidates: Candidate[] = []
  const files: NonNullable<ElectionSnapshot['upstream']>['files'] = []
  const regional = states.map((state) => {
    const scope = state.uf.toLowerCase()
    const parsed = decodeEa20(rawFiles.get(scope), scope, config)
    for (const c of parsed.candidates) {
      if (!c.party) throw new Error(`Partido ausente em ${state.uf}.`)
      candidates.push({
        id: `${state.uf}:${c.sqcand}`,
        uf: state.uf,
        name: c.nmu,
        number: c.n,
        party: c.party,
        color: partyColors[c.party] ?? '#64748b',
      })
    }
    files.push(parsed.metadata)
    return {
      ...parsed.result,
      uf: state.uf,
      votes: parsed.result.votes.map((v) => ({
        ...v,
        candidateId: `${state.uf}:${v.candidateId}`,
      })),
    }
  })
  return snapshotSchema.parse({
    year: 2026,
    office: 'governor',
    round: 1,
    source: config.source,
    updatedAt: files
      .map((f) => f.generatedAt)
      .sort()
      .at(-1),
    candidates,
    states: regional,
    // Section totals only. Never combine votes from distinct state elections.
    national: {
      sectionsTotal: regional.reduce((n, s) => n + s.sectionsTotal, 0),
      sectionsCounted: regional.reduce((n, s) => n + s.sectionsCounted, 0),
      sectionMetric: 'totalized',
      votes: [],
      totalizationStatus: regional.every((s) => s.totalizationStatus === 'not-started')
        ? 'not-started'
        : regional.every((s) => s.totalizationStatus === 'completed')
          ? 'completed'
          : 'partial',
    },
    upstream: {
      electionCode: config.electionCode,
      environment: config.environment,
      fetchedAt,
      files,
    },
  })
}

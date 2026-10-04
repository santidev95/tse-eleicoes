import { states } from './states'
import { snapshotSchema } from '../domain/election'
import type { ElectionSnapshot, Office } from '../domain/election'

// Fictional candidates and results. The same source drives the map, panels and national totals.
const samples: Record<string, [number, number, number]> = {
  AC: [35, 88.7, 260_000],
  AL: [61, 80.4, 1_650_000],
  AP: [52, 75.1, 330_000],
  AM: [54, 74.2, 1_800_000],
  BA: [68.2, 84.4, 7_700_000],
  CE: [65, 89.1, 4_600_000],
  DF: [40, 83.8, 1_650_000],
  ES: [42, 92.4, 2_000_000],
  GO: [36, 85.7, 3_300_000],
  MA: [64, 72.8, 3_000_000],
  MT: [32, 78.4, 1_650_000],
  MS: [35, 86.2, 1_350_000],
  MG: [49.1, 78.2, 10_200_000],
  PA: [54, 71.8, 3_600_000],
  PB: [60, 88.2, 2_000_000],
  PR: [35, 82.9, 5_500_000],
  PE: [63, 84.7, 4_800_000],
  PI: [67, 90.6, 1_600_000],
  RJ: [43, 74.6, 8_000_000],
  RN: [58, 87.4, 1_750_000],
  RS: [42, 85.8, 5_600_000],
  RO: [31, 83.1, 750_000],
  RR: [48, 91.5, 230_000],
  SC: [30, 93.2, 3_500_000],
  SP: [43, 72.1, 20_600_000],
  SE: [60, 88.6, 1_100_000],
  TO: [51, 79.8, 780_000],
}
export function createMockSnapshot(office: Office = 'president'): ElectionSnapshot {
  if (office === 'governor') {
    const base = createMockSnapshot()
    const parties = ['PSD', 'UNIÃO', 'PT', 'MDB', 'PL', 'REPUBLICANOS', 'PP', 'PSB']
    const colors = ['#3b82f6', '#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6366f1', '#ec4899']
    return snapshotSchema.parse({ ...base, office,
      candidates: base.states.flatMap((state,i) => base.candidates.map((c,j) => ({ ...c, id: `${state.uf}:${c.id}`, uf: state.uf, name:`Candidato ${state.uf} ${c.id.toUpperCase()}`, party:parties[(i+j)%parties.length], color:colors[(i+j)%colors.length] }))),
      states: base.states.map((s,i) => ({ ...s, outcome:i < 8 ? 'elected' : i < 22 ? 'runoff' : 'counting', votes:s.votes.map(v => ({...v,candidateId:`${s.uf}:${v.candidateId}`})) })),
      national: { ...base.national, votes:[] } })
  }
  const candidates = [
    { id: 'a', name: 'Candidato A', number: '13', color: '#e11d48' },
    { id: 'b', name: 'Candidato B', number: '22', color: '#2563eb' },
    { id: 'c', name: 'Candidato C', number: '15', color: '#94a3b8' },
  ]
  const results = states.map((state) => {
    const [shareA, counted, votesTotal] = samples[state.uf]
    const sectionsTotal = Math.round(votesTotal / 240)
    const a = Math.round((votesTotal * shareA) / 100)
    const c = Math.round(votesTotal * 0.075)
    return {
      uf: state.uf,
      sectionsTotal,
      sectionsCounted: Math.round((sectionsTotal * counted) / 100),
      votes: [
        { candidateId: 'a', count: a },
        { candidateId: 'b', count: votesTotal - a - c },
        { candidateId: 'c', count: c },
      ],
    }
  })
  return snapshotSchema.parse({
    year: 2026,
    office: 'president',
    round: 1,
    source: 'mock',
    updatedAt: '2026-10-04T22:42:00.000Z',
    candidates,
    states: results,
    national: {
      sectionsTotal: results.reduce((total, result) => total + result.sectionsTotal, 0),
      sectionsCounted: results.reduce((total, result) => total + result.sectionsCounted, 0),
      votes: candidates.map((candidate) => ({
        candidateId: candidate.id,
        count: results.reduce(
          (total, result) =>
            total + (result.votes.find((vote) => vote.candidateId === candidate.id)?.count ?? 0),
          0,
        ),
      })),
    },
  })
}

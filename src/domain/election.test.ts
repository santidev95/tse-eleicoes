import { describe, expect, it } from 'vitest'
import { createMockSnapshot } from '../data/mock-election'
import { countedPercent, mapColor, resultOverview, snapshotSchema } from './election'
describe('presidential election contract', () => {
  it('keeps national votes and sections consistent with all 27 states', () => {
    const data = createMockSnapshot()
    expect(new Set(data.states.map((state) => state.uf)).size).toBe(27)
    expect(data.national.sectionsCounted).toBe(
      data.states.reduce((total, state) => total + state.sectionsCounted, 0),
    )
    for (const vote of data.national.votes)
      expect(vote.count).toBe(
        data.states.reduce(
          (total, state) =>
            total + state.votes.find((item) => item.candidateId === vote.candidateId)!.count,
          0,
        ),
      )
    expect(
      data.states.filter((state) => resultOverview(state, data.candidates).leader?.id === 'a'),
    ).toHaveLength(15)
  })
  it('does not declare a leader for a tie or no votes', () => {
    const { candidates } = createMockSnapshot()
    const result = {
      sectionsTotal: 0,
      sectionsCounted: 0,
      votes: [
        { candidateId: 'a', count: 10 },
        { candidateId: 'b', count: 10 },
      ],
    }
    expect(resultOverview(result, candidates).leader).toBeNull()
    expect(mapColor(result, candidates, 'leader')).toBe('#526071')
    expect(countedPercent(result)).toBe(0)
    expect(resultOverview({ ...result, votes: [] }, candidates).noVotes).toBe(true)
  })
  it('rejects invalid sections, duplicate UFs, unknown candidates and non-presidential data', () => {
    const data = createMockSnapshot()
    expect(snapshotSchema.safeParse({ ...data, office: 'governor' }).success).toBe(false)
    expect(
      snapshotSchema.safeParse({
        ...data,
        national: { ...data.national, sectionsCounted: data.national.sectionsTotal + 1 },
      }).success,
    ).toBe(false)
    expect(
      snapshotSchema.safeParse({
        ...data,
        states: data.states.map((state, i) => (i === 1 ? data.states[0] : state)),
      }).success,
    ).toBe(false)
    expect(
      snapshotSchema.safeParse({
        ...data,
        national: { ...data.national, votes: [{ candidateId: 'unknown', count: 10 }] },
      }).success,
    ).toBe(false)
  })
})

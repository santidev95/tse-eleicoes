import { createTseSource } from '../server/tse-source'
import { countedPercent, resultOverview } from '../src/domain/election'
const source = createTseSource()
const data = await source.load()
const { first, second } = resultOverview(data.national, data.candidates)
const cached = await source.load()
if (data !== cached || data.states.length !== 27 || data.source !== 'tse-sim')
  throw new Error('Falha na integração/cache.')
console.log(
  JSON.stringify(
    {
      source: data.source,
      election: data.upstream?.electionCode,
      generatedAt: data.updatedAt,
      fetchedAt: data.upstream?.fetchedAt,
      files: data.upstream?.files.length,
      candidates: data.candidates.length,
      counted: countedPercent(data.national),
      first: { number: first.number, percent: first.percent, destination: first.destination },
      second: { number: second.number, percent: second.percent },
      cache: 'hit',
      allStates: data.states.map((s) => s.uf),
    },
    null,
    2,
  ),
)

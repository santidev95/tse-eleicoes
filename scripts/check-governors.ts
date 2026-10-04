import { writeFile, mkdir } from 'node:fs/promises'
import { GOVERNORS } from '../server/tse-adapter.ts'
import { createTseSource } from '../server/tse-source.ts'
const snapshot = await createTseSource({ config: GOVERNORS }).load()
await mkdir('artifacts', { recursive: true })
await writeFile('artifacts/governors-live.json', JSON.stringify(snapshot))
console.log(
  JSON.stringify({
    office: snapshot.office,
    election: snapshot.upstream?.electionCode,
    files: snapshot.upstream?.files.length,
    states: snapshot.states.length,
    candidates: snapshot.candidates.length,
    nationalVotes: snapshot.national.votes.length,
    updatedAt: snapshot.updatedAt,
  }),
)

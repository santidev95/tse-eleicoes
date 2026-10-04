import { createTseSource } from '../server/tse-source.ts'
import { OFFICIAL } from '../server/tse-adapter.ts'
const source = createTseSource({ config: OFFICIAL })
const data = await source.load()
console.log(
  JSON.stringify(
    {
      source: data.source,
      environment: data.upstream?.environment,
      electionCode: data.upstream?.electionCode,
      files: data.upstream?.files.length,
      candidates: data.candidates.length,
      sections: data.national.sectionsCounted,
      disclosureAllowed: data.national.disclosureAllowed,
      status: data.national.totalizationStatus,
      updatedAt: data.updatedAt,
    },
    null,
    2,
  ),
)

import type { Office } from '../domain/election'
import dimensions from '../data/governor-asset-dimensions.json'

export function OfficeSelector({ office, onChange }: { office: Office; onChange: (office: Office) => void }) {
  return <div className="office-selector" role="group" aria-label="Cargo em apuração">
    {(['president', 'governor'] as const).map(value => <button key={value} aria-pressed={office === value} onClick={() => onChange(value)}>
      <img src={`/design/governors/${value}.svg`} alt="" width={dimensions[value].width} height={dimensions[value].height} />
      {value === 'president' ? 'Presidente' : 'Governadores'}
    </button>)}
  </div>
}

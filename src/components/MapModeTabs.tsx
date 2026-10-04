import type { MapMode } from '../domain/election'
const modes = [
  { id: 'leader', label: 'Mais votado' },
  { id: 'margin', label: 'Diferença' },
  { id: 'counted', label: '% Apurado' },
] as const
export function MapModeTabs({
  mode,
  onChange,
}: {
  mode: MapMode
  onChange: (mode: MapMode) => void
}) {
  return (
    <fieldset className="mode-tabs">
      <legend className="sr-only">Modo de visualização do mapa</legend>
      {modes.map((item) => (
        <label className={item.id === mode ? 'active' : ''} key={item.id}>
          <input
            type="radio"
            name="map-mode"
            value={item.id}
            checked={item.id === mode}
            onChange={() => onChange(item.id)}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

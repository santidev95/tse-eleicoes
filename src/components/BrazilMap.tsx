import { useId } from 'react'
import dimensions from '../data/asset-dimensions.json'
import { mapGeometry } from '../data/map-geometry'
import { stateByUf } from '../data/states'
import { designBlueStates } from '../data/design-colors'
import { useCompactViewport } from '../hooks/useCompactViewport'
import { countedPercent, formatPercent, mapColor, resultOverview } from '../domain/election'
import type { ElectionSnapshot, MapMode } from '../domain/election'
import type { UF } from '../data/states'
import type { HoverTarget } from './StateTooltip'
export function BrazilMap({
  data,
  mode,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  data: ElectionSnapshot
  mode: MapMode
  selected: UF | null
  hovered: UF | null
  onHover: (target: HoverTarget | null) => void
  onSelect: (uf: UF) => void
}) {
  const prefix = useId().replaceAll(':', '')
  const compact = useCompactViewport()
  const results = new Map(data.states.map((state) => [state.uf, state]))
  return (
    <svg
      className="brazil-map"
      viewBox={compact ? '70 15 780 745' : '0 0 960 760'}
      role="group"
      aria-labelledby={`${prefix}-title ${prefix}-desc`}
    >
      <title id={`${prefix}-title`}>Apuração presidencial por estado</title>
      <desc id={`${prefix}-desc`}>
        Mapa geométrico do Brasil. Use Tab para focar uma UF, Enter ou Espaço para abrir detalhes e
        Escape para fechar. Modo:{' '}
        {mode === 'leader'
          ? 'candidato mais votado'
          : mode === 'margin'
            ? 'diferença em pontos percentuais'
            : 'percentual apurado'}
        .
      </desc>
      <defs>
        {mapGeometry.map((geometry) => {
          const color = mapColor(results.get(geometry.uf)!, data.candidates, mode)
          const originalColor = designBlueStates.has(geometry.uf) ? '#2563eb' : '#e11d48'
          const preserveOriginal = mode === 'leader' && color === originalColor
          return (
            <filter
              id={`${prefix}-${geometry.uf}`}
              key={geometry.uf}
              x="-8%"
              y="-8%"
              width="116%"
              height="116%"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodColor={color} result="color" className="state-color" />
              <feComposite in="color" in2="SourceAlpha" operator="in" result="paint" />
              {(selected === geometry.uf || hovered === geometry.uf) && (
                <>
                  <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="outline" />
                  <feFlood floodColor="#ffffff" floodOpacity="0.9" result="white" />
                  <feComposite in="white" in2="outline" operator="in" result="border" />
                </>
              )}
              <feMerge>
                {(selected === geometry.uf || hovered === geometry.uf) && (
                  <feMergeNode in="border" />
                )}
                <feMergeNode in={preserveOriginal ? 'SourceGraphic' : 'paint'} />
              </feMerge>
            </filter>
          )
        })}
      </defs>
      {mapGeometry.map((geometry) => {
        const result = results.get(geometry.uf)!,
          state = stateByUf[geometry.uf],
          original = dimensions[geometry.uf]
        const { leader, noVotes } = resultOverview(result, data.candidates)
        const label = `${state.name}, ${formatPercent(countedPercent(result), 1)} apurado, ${noVotes ? 'sem votos' : leader ? `${leader.name} lidera` : 'empate'}`
        return (
          <g
            key={geometry.uf}
            role="button"
            tabIndex={0}
            data-state={geometry.uf}
            aria-label={label}
            aria-pressed={selected === geometry.uf}
            aria-describedby={hovered === geometry.uf ? 'state-tooltip' : undefined}
            className={`map-state ${selected === geometry.uf || hovered === geometry.uf ? 'is-active' : ''}`}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch')
                onHover({ uf: geometry.uf, x: event.clientX, y: event.clientY })
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== 'touch')
                onHover({ uf: geometry.uf, x: event.clientX, y: event.clientY })
            }}
            onPointerLeave={() => onHover(null)}
            onFocus={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect()
              onHover({ uf: geometry.uf, x: bounds.right, y: bounds.top })
            }}
            onBlur={() => onHover(null)}
            onClick={() => {
              onHover(null)
              onSelect(geometry.uf)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onHover(null)
                onSelect(geometry.uf)
              }
            }}
          >
            <g
              transform={`translate(${geometry.x} ${geometry.y}) scale(${geometry.width / original.width} ${geometry.height / original.height})`}
            >
              <image
                href={`/design/${geometry.uf}.svg`}
                width={original.width}
                height={original.height}
                filter={`url(#${prefix}-${geometry.uf})`}
              />
            </g>
            <text
              x={geometry.labelX}
              y={geometry.labelY}
              dominantBaseline="central"
              textAnchor="middle"
              fontSize={geometry.fontSize}
              aria-hidden="true"
            >
              {geometry.uf}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

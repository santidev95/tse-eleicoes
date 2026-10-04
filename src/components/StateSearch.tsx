import { useEffect, useRef, useState } from 'react'
import { states } from '../data/states'
import type { UF } from '../data/states'
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
export function StateSearch({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (uf: UF) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])
  const filtered = states.filter((state) =>
    normalize(`${state.name} ${state.uf}`).includes(normalize(query)),
  )
  return (
    <dialog
      ref={dialog}
      className="state-search"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="search-heading"
    >
      <div className="search-heading">
        <h2 id="search-heading">Buscar estado</h2>
        <button className="close-button" onClick={onClose} aria-label="Fechar busca">
          ×
        </button>
      </div>
      <label className="sr-only" htmlFor="state-query">
        Nome ou sigla do estado
      </label>
      <input
        id="state-query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nome ou sigla do estado"
        autoComplete="off"
      />
      <div className="search-results">
        {filtered.map((state) => (
          <button
            key={state.uf}
            onClick={() => {
              dialog.current?.close()
              onClose()
              onSelect(state.uf)
            }}
          >
            <span>{state.name}</span>
            <span className="mono">{state.uf}</span>
          </button>
        ))}
        {filtered.length === 0 && <p role="status">Nenhum estado encontrado.</p>}
      </div>
    </dialog>
  )
}

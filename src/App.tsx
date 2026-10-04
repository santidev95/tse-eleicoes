import { useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header'
import { NationalSummary } from './components/NationalSummary'
import { GovernorSummary } from './components/GovernorSummary'
import { createElectionService } from './services/election-service'
import governorDimensions from './data/governor-asset-dimensions.json'
import { BrazilMap } from './components/BrazilMap'
import { StateTooltip } from './components/StateTooltip'
import { StateDetailsPanel } from './components/StateDetailsPanel'
import { MapModeTabs } from './components/MapModeTabs'
import { MapLegend } from './components/MapLegend'
import { StateSearch } from './components/StateSearch'
import { useElection } from './hooks/useElection'
import type { UF } from './data/states'
import type { MapMode, Office } from './domain/election'
import type { HoverTarget } from './components/StateTooltip'
import './App.css'
const services = {
  president: createElectionService(),
  governor: createElectionService(undefined, 'governor'),
}
function App() {
  const [office, setOffice] = useState<Office>(() =>
    new URLSearchParams(location.search).get('cargo') === 'governador' ? 'governor' : 'president',
  )
  const changeOffice = (value: Office) => {
    const url = new URL(location.href)
    if (value === 'governor') url.searchParams.set('cargo', 'governador')
    else url.searchParams.delete('cargo')
    history.replaceState(null, '', url)
    setOffice(value)
  }
  return <ElectionView key={office} office={office} onOfficeChange={changeOffice} />
}
function ElectionView({
  office,
  onOfficeChange,
}: {
  office: Office
  onOfficeChange: (office: Office) => void
}) {
  const { data, error, loading, retry } = useElection(services[office])
  const [mode, setMode] = useState<MapMode>('leader')
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const [selected, setSelected] = useState<UF | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const selectedResult = data?.states.find((state) => state.uf === selected)
  const hoveredResult = data?.states.find((state) => state.uf === hover?.uf)
  const closePanel = useCallback(() => {
    const previous = selected
    setSelected(null)
    setHover(null)
    requestAnimationFrame(() => {
      document
        .querySelector<SVGGElement>(`[data-state="${previous}"]`)
        ?.focus({ preventScroll: true })
    })
  }, [selected])
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && data) {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
      if (event.key === 'Escape' && !searchOpen) {
        setHover(null)
        if (selected) closePanel()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [data, selected, searchOpen, closePanel])
  useEffect(() => {
    const clear = () => setHover(null)
    window.addEventListener('resize', clear)
    window.addEventListener('scroll', clear, { passive: true })
    return () => {
      window.removeEventListener('resize', clear)
      window.removeEventListener('scroll', clear)
    }
  }, [])
  return (
    <div className={`election-app office-${office}`}>
      <a className="skip-link" href="#main">
        Ir para o mapa
      </a>
      <Header
        office={office}
        onOfficeChange={onOfficeChange}
        data={data}
        loading={loading}
        stale={!!error && !!data}
        onSearch={() => setSearchOpen(true)}
      />
      <main id="main" tabIndex={-1}>
        <h2 className="sr-only">
          {office === 'president' ? 'Presidente da República' : 'Governadores'} · Brasil · 2026
        </h2>
        {data &&
          (office === 'president' ? (
            <NationalSummary data={data} />
          ) : (
            <GovernorSummary data={data} onSelect={setSelected} />
          ))}
        {!data && loading && <div className="summary-skeleton" aria-hidden="true" />}
        {error && (
          <div className="error-notice" role="alert">
            <span>
              {data ? 'Exibindo a última atualização disponível. ' : ''}
              {error}
            </span>
            <button onClick={retry} disabled={loading}>
              {loading ? 'Tentando…' : 'Tentar novamente'}
            </button>
          </div>
        )}
        <section
          className={`map-stage ${selected ? 'has-selection' : ''}`}
          aria-label="Mapa interativo do Brasil"
          aria-busy={!data && loading}
        >
          {data ? (
            <>
              <MapModeTabs mode={mode} onChange={setMode} />
              <p className="interactive-tip">
                <img
                  src={
                    office === 'governor' ? '/design/governors/pointer.svg' : '/design/pointer.svg'
                  }
                  alt=""
                  width={office === 'governor' ? governorDimensions.pointer.width : 10.1062}
                  height={office === 'governor' ? governorDimensions.pointer.height : 12.25}
                />
                <span className="desktop-tip">Passe o mouse ou clique no estado para detalhes</span>
                <span className="mobile-tip">Toque em um estado para explorar</span>
              </p>
              <div className="map-canvas">
                <BrazilMap
                  data={data}
                  mode={mode}
                  selected={selected}
                  hovered={hover?.uf ?? null}
                  onHover={setHover}
                  onSelect={setSelected}
                />
              </div>
              <MapLegend data={data} mode={mode} />
              {selectedResult && (
                <StateDetailsPanel
                  office={office}
                  result={selectedResult}
                  candidates={data.candidates}
                  round={data.round}
                  mock={data.source === 'mock'}
                  onClose={closePanel}
                />
              )}
            </>
          ) : loading ? (
            <div className="loading-state" role="status">
              <span className="loading-spinner" />
              <p>
                Carregando a apuração {office === 'president' ? 'presidencial' : 'dos governadores'}
                …
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <span className="eyebrow">
                {office === 'president' ? 'APURAÇÃO PRESIDENCIAL' : 'GOVERNADORES'}
              </span>
              <h3>Dados indisponíveis</h3>
              <p>Tente carregar a apuração novamente.</p>
            </div>
          )}
        </section>
        {data && hover && hoveredResult && !searchOpen && (
          <StateTooltip result={hoveredResult} candidates={data.candidates} position={hover} />
        )}
        <span className="sr-only" role="status">
          {data
            ? `Apuração carregada. ${data.source === 'mock' ? 'Dados simulados.' : data.source === 'tse-sim' ? 'Simulado do TSE.' : 'Fonte TSE.'}`
            : ''}
        </span>
      </main>
      <footer>
        {!data
          ? 'Eleições 2026 · aguardando dados da fonte configurada'
          : data.source === 'tse-sim'
            ? 'Simulado do TSE · candidatos fictícios · mais votos computados · não representa resultados oficiais'
            : data?.source === 'tse'
              ? `Fonte: Tribunal Superior Eleitoral (TSE) · ${office === 'president' ? 'Apuração presidencial' : 'Governadores · 27 disputas estaduais'}`
              : 'Demonstração visual · candidatos e resultados fictícios · sem conexão com a apuração oficial'}
      </footer>
      <StateSearch open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={setSelected} />
    </div>
  )
}
export default App

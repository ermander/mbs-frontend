'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Container } from '@/components/ui/container'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getCountryFlagUrl } from '@/lib/country-flags'
import {
  extractMessage,
  getBookmakerSummary,
  getScrapedCompetitions,
  getScrapedCompetitionEvents,
  getScrapedEventMarkets,
  getScrapedMarketOutcomes,
  type BookmakerSummaryDto,
  type CompetitionDrilldownItemDto,
  type CompetitionListDto,
  type EventDrilldownItemDto,
  type EventListDto,
  type MarketDrilldownItemDto,
  type MarketListDto,
  type OdMarketStatus,
  type OdMatchStatus,
  type OdOutcomeStatus,
  type OutcomeListDto,
} from '@/services/api/backoffice-scraper-drilldown-client'

const ADAPTER_TYPE_LABELS: Record<string, string> = {
  api: 'API',
  playwright: 'Playwright',
  websocket: 'WebSocket',
}

type DrillLevel = 'competitions' | 'events' | 'markets' | 'outcomes'

const TABS = [
  { id: 'config', label: 'Configurazione' },
  { id: 'data', label: 'Dati scrapati' },
] as const

export default function ScraperDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [activeTab, setActiveTab] = useState<'config' | 'data'>('config')

  // --- Summary ---
  const [summary, setSummary] = useState<BookmakerSummaryDto | null>(null)
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // --- Drill-down state ---
  const [level, setLevel] = useState<DrillLevel>('competitions')
  const [includePast, setIncludePast] = useState<boolean>(false)

  const [competitions, setCompetitions] = useState<CompetitionListDto | null>(null)
  const [events, setEvents] = useState<EventListDto | null>(null)
  const [markets, setMarkets] = useState<MarketListDto | null>(null)
  const [outcomes, setOutcomes] = useState<OutcomeListDto | null>(null)

  const [dataLoading, setDataLoading] = useState<boolean>(false)
  const [dataError, setDataError] = useState<string | null>(null)

  // --- Breadcrumb selections ---
  const [selectedCompetition, setSelectedCompetition] =
    useState<CompetitionDrilldownItemDto | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventDrilldownItemDto | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<MarketDrilldownItemDto | null>(null)

  // --- Loaders ---

  const loadSummary = useCallback(async () => {
    if (!slug) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await getBookmakerSummary(slug)
      setSummary(data)
    } catch (err) {
      setSummaryError(extractMessage(err, 'Errore nel caricamento del bookmaker.'))
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [slug])

  const loadCompetitions = useCallback(async () => {
    if (!slug) return
    setDataLoading(true)
    setDataError(null)
    try {
      const data = await getScrapedCompetitions(slug, includePast)
      setCompetitions(data)
    } catch (err) {
      setDataError(extractMessage(err, 'Errore nel caricamento delle competizioni.'))
    } finally {
      setDataLoading(false)
    }
  }, [slug, includePast])

  const loadEvents = useCallback(
    async (competitionId: string) => {
      if (!slug) return
      setDataLoading(true)
      setDataError(null)
      try {
        const data = await getScrapedCompetitionEvents(slug, competitionId, includePast)
        setEvents(data)
      } catch (err) {
        setDataError(extractMessage(err, 'Errore nel caricamento degli eventi.'))
      } finally {
        setDataLoading(false)
      }
    },
    [slug, includePast],
  )

  const loadMarkets = useCallback(
    async (eventId: string) => {
      if (!slug) return
      setDataLoading(true)
      setDataError(null)
      try {
        const data = await getScrapedEventMarkets(slug, eventId)
        setMarkets(data)
      } catch (err) {
        setDataError(extractMessage(err, 'Errore nel caricamento dei mercati.'))
      } finally {
        setDataLoading(false)
      }
    },
    [slug],
  )

  const loadOutcomes = useCallback(
    async (marketId: string) => {
      if (!slug) return
      setDataLoading(true)
      setDataError(null)
      try {
        const data = await getScrapedMarketOutcomes(slug, marketId)
        setOutcomes(data)
      } catch (err) {
        setDataError(extractMessage(err, 'Errore nel caricamento degli esiti.'))
      } finally {
        setDataLoading(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  // Load competitions when data tab first opens, or when includePast flips
  // while we're at the competitions level.
  useEffect(() => {
    if (activeTab !== 'data') return
    if (level !== 'competitions') return
    void loadCompetitions()
  }, [activeTab, level, loadCompetitions])

  // When includePast flips while drilled into events, re-fetch events too.
  useEffect(() => {
    if (activeTab !== 'data') return
    if (level !== 'events') return
    if (!selectedCompetition) return
    void loadEvents(selectedCompetition.competitionId)
    // we intentionally omit loadEvents from deps to avoid loops; includePast
    // is already a dependency via loadEvents' own useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includePast])

  // --- Click handlers ---

  const onCompetitionClick = (c: CompetitionDrilldownItemDto) => {
    setSelectedCompetition(c)
    setSelectedEvent(null)
    setSelectedMarket(null)
    setEvents(null)
    setMarkets(null)
    setOutcomes(null)
    setLevel('events')
    void loadEvents(c.competitionId)
  }

  const onEventClick = (e: EventDrilldownItemDto) => {
    setSelectedEvent(e)
    setSelectedMarket(null)
    setMarkets(null)
    setOutcomes(null)
    setLevel('markets')
    void loadMarkets(e.eventId)
  }

  const onMarketClick = (m: MarketDrilldownItemDto) => {
    setSelectedMarket(m)
    setOutcomes(null)
    setLevel('outcomes')
    void loadOutcomes(m.canonicalMarketId)
  }

  // --- Breadcrumb navigation ---

  const goToCompetitions = () => {
    setLevel('competitions')
    setSelectedCompetition(null)
    setSelectedEvent(null)
    setSelectedMarket(null)
  }

  const goToEvents = () => {
    setLevel('events')
    setSelectedEvent(null)
    setSelectedMarket(null)
  }

  const goToMarkets = () => {
    setLevel('markets')
    setSelectedMarket(null)
  }

  // --- Refresh current level ---

  const refreshCurrentLevel = () => {
    if (level === 'competitions') void loadCompetitions()
    else if (level === 'events' && selectedCompetition)
      void loadEvents(selectedCompetition.competitionId)
    else if (level === 'markets' && selectedEvent) void loadMarkets(selectedEvent.eventId)
    else if (level === 'outcomes' && selectedMarket)
      void loadOutcomes(selectedMarket.canonicalMarketId)
  }

  // --- Render helpers ---

  const enabledSportsLabel = useMemo(() => {
    if (!summary) return ''
    if (summary.enabledSports === null) {
      return `Tutti i mappati (${summary.mappedSports.length})`
    }
    return summary.enabledSports.join(', ') || 'nessuno'
  }, [summary])

  return (
    <Container>
      <div className="mb-4">
        <Link
          href="/backoffice/scrapers"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Torna alla lista scraper
        </Link>
      </div>

      {summaryLoading ? (
        <p className="py-6 text-center text-muted-foreground">Caricamento bookmaker...</p>
      ) : summaryError ? (
        <p className="py-6 text-center text-destructive">{summaryError}</p>
      ) : summary ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {summary.name}
            </h2>
            <Badge variant="outline">
              {ADAPTER_TYPE_LABELS[summary.adapterType] ?? summary.adapterType}
            </Badge>
            <Badge variant={summary.scrapeEnabled ? 'success' : 'outline'}>
              {summary.scrapeEnabled ? 'Scraping ON' : 'Scraping OFF'}
            </Badge>
            {!summary.isActive && <Badge variant="destructive">Non attivo</Badge>}
            <span className="ml-auto font-mono text-xs text-muted-foreground">{summary.slug}</span>
          </div>

          <div className="mb-4">
            <Tabs
              tabs={[...TABS]}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as 'config' | 'data')}
            />
          </div>

          {activeTab === 'config' ? (
            <ConfigurationTab summary={summary} enabledSportsLabel={enabledSportsLabel} />
          ) : (
            <DataTab
              level={level}
              includePast={includePast}
              onIncludePastChange={setIncludePast}
              onRefresh={refreshCurrentLevel}
              dataLoading={dataLoading}
              dataError={dataError}
              competitions={competitions}
              events={events}
              markets={markets}
              outcomes={outcomes}
              selectedCompetition={selectedCompetition}
              selectedEvent={selectedEvent}
              selectedMarket={selectedMarket}
              onCompetitionClick={onCompetitionClick}
              onEventClick={onEventClick}
              onMarketClick={onMarketClick}
              onGoToCompetitions={goToCompetitions}
              onGoToEvents={goToEvents}
              onGoToMarkets={goToMarkets}
            />
          )}
        </>
      ) : null}
    </Container>
  )
}

// =====================================================================
// Configurazione tab — read-only summary grid
// =====================================================================

function ConfigurationTab({
  summary,
  enabledSportsLabel,
}: {
  summary: BookmakerSummaryDto
  enabledSportsLabel: string
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Row label="Nome" value={summary.name} />
        <Row label="Slug" value={<span className="font-mono text-xs">{summary.slug}</span>} />
        <Row
          label="Adapter type"
          value={ADAPTER_TYPE_LABELS[summary.adapterType] ?? summary.adapterType}
        />
        <Row label="Attivo" value={summary.isActive ? 'Sì' : 'No'} />
        <Row label="Scraping" value={summary.scrapeEnabled ? 'Abilitato' : 'Disabilitato'} />
        <Row label="Intervallo scrape" value={`${summary.scrapeIntervalSeconds} s`} />
        <Row
          label="Sport mappati"
          value={summary.mappedSports.length > 0 ? summary.mappedSports.join(', ') : '—'}
        />
        <Row label="Sport abilitati" value={enabledSportsLabel} />
        <Row
          label="Ultimo run"
          value={
            summary.lastRunAt
              ? `${formatDateTime(summary.lastRunAt)}${summary.lastRunStatus ? ` (${summary.lastRunStatus})` : ''}`
              : 'Mai'
          }
        />
        <Row label="Creato il" value={formatDateTime(summary.createdAt)} />
        <Row label="Aggiornato il" value={formatDateTime(summary.updatedAt)} />
        <Row label="Competizioni future scrapate" value={String(summary.futureCompetitionCount)} />
        <Row label="Eventi futuri scrapati" value={String(summary.futureEventCount)} />
      </dl>
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Per modificare queste impostazioni torna alla{' '}
        <Link href="/backoffice/scrapers" className="text-primary underline">
          lista scraper
        </Link>
        .
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

// =====================================================================
// Dati scrapati tab — breadcrumb + level-specific list
// =====================================================================

interface DataTabProps {
  level: DrillLevel
  includePast: boolean
  onIncludePastChange: (v: boolean) => void
  onRefresh: () => void
  dataLoading: boolean
  dataError: string | null
  competitions: CompetitionListDto | null
  events: EventListDto | null
  markets: MarketListDto | null
  outcomes: OutcomeListDto | null
  selectedCompetition: CompetitionDrilldownItemDto | null
  selectedEvent: EventDrilldownItemDto | null
  selectedMarket: MarketDrilldownItemDto | null
  onCompetitionClick: (c: CompetitionDrilldownItemDto) => void
  onEventClick: (e: EventDrilldownItemDto) => void
  onMarketClick: (m: MarketDrilldownItemDto) => void
  onGoToCompetitions: () => void
  onGoToEvents: () => void
  onGoToMarkets: () => void
}

function DataTab(props: DataTabProps) {
  const {
    level,
    includePast,
    onIncludePastChange,
    onRefresh,
    dataLoading,
    dataError,
    competitions,
    events,
    markets,
    outcomes,
    selectedCompetition,
    selectedEvent,
    selectedMarket,
    onCompetitionClick,
    onEventClick,
    onMarketClick,
    onGoToCompetitions,
    onGoToEvents,
    onGoToMarkets,
  } = props

  return (
    <div className="rounded-md border border-border bg-card">
      {/* Breadcrumb + controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={onGoToCompetitions}
            className={
              level === 'competitions'
                ? 'font-medium text-foreground'
                : 'text-primary hover:underline'
            }
          >
            Competizioni
          </button>
          {selectedCompetition && (
            <>
              <span className="text-muted-foreground">›</span>
              <button
                type="button"
                onClick={onGoToEvents}
                className={
                  level === 'events'
                    ? 'font-medium text-foreground'
                    : 'text-primary hover:underline'
                }
              >
                {selectedCompetition.competitionName}
              </button>
            </>
          )}
          {selectedEvent && (
            <>
              <span className="text-muted-foreground">›</span>
              <button
                type="button"
                onClick={onGoToMarkets}
                className={
                  level === 'markets'
                    ? 'font-medium text-foreground'
                    : 'text-primary hover:underline'
                }
              >
                {selectedEvent.homeName ?? '?'} - {selectedEvent.awayName ?? '?'}
              </button>
            </>
          )}
          {selectedMarket && (
            <>
              <span className="text-muted-foreground">›</span>
              <span className="font-medium text-foreground">{selectedMarket.marketTypeName}</span>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => onIncludePastChange(e.target.checked)}
              className="h-3 w-3"
            />
            Mostra anche conclusi
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={dataLoading}
            className="rounded border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {dataLoading ? 'Caricamento...' : 'Aggiorna'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {dataError && <p className="mb-3 text-sm text-destructive">{dataError}</p>}

        {level === 'competitions' &&
          (competitions ? (
            <CompetitionsList items={competitions.competitions} onClick={onCompetitionClick} />
          ) : dataLoading ? (
            <LoadingLine />
          ) : null)}

        {level === 'events' &&
          (events ? (
            <EventsList items={events.events} onClick={onEventClick} />
          ) : dataLoading ? (
            <LoadingLine />
          ) : null)}

        {level === 'markets' &&
          (markets ? (
            <MarketsList
              items={markets.markets}
              onClick={onMarketClick}
              eventContext={markets.event}
            />
          ) : dataLoading ? (
            <LoadingLine />
          ) : null)}

        {level === 'outcomes' &&
          (outcomes ? <OutcomesList data={outcomes} /> : dataLoading ? <LoadingLine /> : null)}
      </div>
    </div>
  )
}

function LoadingLine() {
  return <p className="py-6 text-center text-sm text-muted-foreground">Caricamento...</p>
}

// =====================================================================
// Level 1: competitions list
// =====================================================================

const UNKNOWN_NATION_KEY = '—'

function CompetitionsList({
  items,
  onClick,
}: {
  items: CompetitionDrilldownItemDto[]
  onClick: (c: CompetitionDrilldownItemDto) => void
}) {
  const [filterSport, setFilterSport] = useState<string>('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [expandedNations, setExpandedNations] = useState<Set<string>>(() => new Set())

  const availableSports = useMemo(
    () => Array.from(new Set(items.map((c) => c.sportName))).sort(),
    [items],
  )

  const availableCountries = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((c) => c.categoryName)
            .filter((v): v is string => typeof v === 'string' && v.length > 0),
        ),
      ).sort(),
    [items],
  )

  const filteredItems = useMemo(() => {
    const needle = filterName.trim().toLowerCase()
    return items.filter((c) => {
      if (filterSport && c.sportName !== filterSport) return false
      if (filterCountry && c.categoryName !== filterCountry) return false
      if (needle && !c.competitionName.toLowerCase().includes(needle)) return false
      return true
    })
  }, [items, filterSport, filterCountry, filterName])

  // Group by nation (categoryName). Preserve the natural sort order we get
  // from the backend (which already groups by sport → nation → competition).
  const groupedByNation = useMemo(() => {
    const map = new Map<string, CompetitionDrilldownItemDto[]>()
    for (const c of filteredItems) {
      const key = c.categoryName ?? UNKNOWN_NATION_KEY
      const bucket = map.get(key)
      if (bucket) bucket.push(c)
      else map.set(key, [c])
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredItems])

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Questo bookmaker non sta attualmente scrapando competizioni. Prova ad abilitare &apos;Mostra
        anche conclusi&apos; o verifica la configurazione dalla lista scraper.
      </p>
    )
  }

  const hasActiveFilter = filterSport !== '' || filterCountry !== '' || filterName !== ''
  const resetFilters = () => {
    setFilterSport('')
    setFilterCountry('')
    setFilterName('')
  }

  // When any filter is active we auto-expand so the user immediately sees
  // the matches without a second click. Without filters, nations are
  // collapsed by default and the user toggles them manually.
  const autoExpandAll = hasActiveFilter
  const isExpanded = (nation: string) => autoExpandAll || expandedNations.has(nation)

  const toggleNation = (nation: string) => {
    setExpandedNations((prev) => {
      const next = new Set(prev)
      if (next.has(nation)) next.delete(nation)
      else next.add(nation)
      return next
    })
  }

  const expandAll = () => {
    setExpandedNations(new Set(groupedByNation.map(([nation]) => nation)))
  }

  const collapseAll = () => {
    setExpandedNations(new Set())
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="rounded border border-border bg-surface-1 px-2 py-1 text-xs text-foreground"
        >
          <option value="">Tutti gli sport</option>
          {availableSports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="rounded border border-border bg-surface-1 px-2 py-1 text-xs text-foreground"
        >
          <option value="">Tutte le nazioni</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="Cerca competizione..."
          className="min-w-[160px] flex-1 rounded border border-border bg-surface-1 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
        />

        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Reset
          </button>
        )}

        <span className="text-xs text-muted-foreground">
          {filteredItems.length} / {items.length}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={expandAll}
            disabled={autoExpandAll}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Espandi tutto
          </button>
          <button
            type="button"
            onClick={collapseAll}
            disabled={autoExpandAll}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Comprimi tutto
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nessuna competizione corrisponde ai filtri applicati.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groupedByNation.map(([nation, nationItems]) => {
            const expanded = isExpanded(nation)
            const totalEvents = nationItems.reduce((sum, c) => sum + c.eventCount, 0)
            const flagUrl = getCountryFlagUrl(nation)
            return (
              <li key={nation} className="rounded-md border border-border bg-surface-1">
                <button
                  type="button"
                  onClick={() => toggleNation(nation)}
                  disabled={autoExpandAll}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
                  aria-expanded={expanded}
                >
                  <span aria-hidden className="w-3 text-xs text-muted-foreground">
                    {expanded ? '▾' : '▸'}
                  </span>
                  <span className="inline-flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                    {flagUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={flagUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                  </span>
                  <span className="font-medium text-foreground">{nation}</span>
                  <span className="text-xs text-muted-foreground">
                    · {nationItems.length} competiz. · {totalEvents} eventi
                  </span>
                </button>
                {expanded && (
                  <ul className="flex flex-col gap-1 border-t border-border px-3 py-2">
                    {nationItems.map((c) => (
                      <li key={c.competitionId}>
                        <button
                          type="button"
                          onClick={() => onClick(c)}
                          className="flex w-full items-center gap-3 rounded-md border border-border/50 bg-background px-3 py-2 text-left hover:bg-muted"
                        >
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="info">{c.sportName}</Badge>
                              <span className="font-medium text-foreground">
                                {c.competitionName}
                              </span>
                            </div>
                            {c.rawCompetitionName && c.rawCompetitionName !== c.competitionName && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Raw: &quot;{c.rawCompetitionName}&quot;
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">{c.eventCount} eventi</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// =====================================================================
// Level 2: events list
// =====================================================================

function EventsList({
  items,
  onClick,
}: {
  items: EventDrilldownItemDto[]
  onClick: (e: EventDrilldownItemDto) => void
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nessun evento futuro per questa competizione.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => (
        <li key={e.eventId}>
          <button
            type="button"
            onClick={() => onClick(e)}
            className="flex w-full items-start gap-3 rounded-md border border-border bg-surface-1 px-3 py-2 text-left hover:bg-muted"
          >
            <div className="min-w-[96px] text-xs text-muted-foreground">
              {formatDateTime(e.startTime)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {e.homeName ?? '?'} - {e.awayName ?? '?'}
                </span>
                <Badge variant="outline">{e.status}</Badge>
                <Badge variant={matchStatusVariant(e.matchStatus)}>
                  {e.matchStatus} · {formatConfidence(e.matchConfidence)}
                </Badge>
              </div>
              {(e.rawHomeName || e.rawAwayName) && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Raw: &quot;{e.rawHomeName ?? '?'}&quot; vs &quot;{e.rawAwayName ?? '?'}&quot;
                </div>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

// =====================================================================
// Level 3: markets list
// =====================================================================

function MarketsList({
  items,
  onClick,
  eventContext,
}: {
  items: MarketDrilldownItemDto[]
  onClick: (m: MarketDrilldownItemDto) => void
  eventContext: MarketListDto['event']
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nessun mercato trovato per questo evento.
      </p>
    )
  }
  return (
    <div>
      {/* Event context header with raw info */}
      <div className="mb-3 rounded border border-border bg-surface-1 px-3 py-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">
            {eventContext.homeName ?? '?'} - {eventContext.awayName ?? '?'}
          </span>
          {' · '}
          {formatDateTime(eventContext.startTime)}
        </div>
        {(eventContext.rawHomeName ||
          eventContext.rawAwayName ||
          eventContext.rawCompetitionName) && (
          <div className="mt-0.5">
            Raw: &quot;{eventContext.rawHomeName ?? '?'}&quot; vs &quot;
            {eventContext.rawAwayName ?? '?'}&quot;
            {eventContext.rawCompetitionName && ` (${eventContext.rawCompetitionName})`}
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((m) => (
          <li key={m.canonicalMarketId}>
            <button
              type="button"
              onClick={() => onClick(m)}
              className="flex w-full items-start gap-3 rounded-md border border-border bg-surface-1 px-3 py-2 text-left hover:bg-muted"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="lavender">{m.marketTypeKey}</Badge>
                  <span className="font-medium text-foreground">{m.marketTypeName}</span>
                  <Badge variant={marketStatusVariant(m.marketStatus)}>{m.marketStatus}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {formatMarketParams(m)}
                  {' · '}
                  {m.activeOutcomeCount}/{m.outcomeCount} esiti attivi
                  {m.lastSeenAt && ` · ultimo update ${formatDateTime(m.lastSeenAt)}`}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatMarketParams(m: MarketDrilldownItemDto): string {
  const parts: string[] = []
  if (m.line !== null) parts.push(`line=${m.line}`)
  if (m.handicap !== null) parts.push(`handicap=${m.handicap}`)
  if (m.teamScope) parts.push(`team=${m.teamScope}`)
  if (m.periodScope) parts.push(`period=${m.periodScope}`)
  return parts.length > 0 ? parts.join(' · ') : 'nessun parametro'
}

// =====================================================================
// Level 4: outcomes table
// =====================================================================

function OutcomesList({ data }: { data: OutcomeListDto }) {
  const { market, outcomes } = data
  if (outcomes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nessun esito configurato per questo mercato.
      </p>
    )
  }
  return (
    <div>
      <div className="mb-3 rounded border border-border bg-surface-1 px-3 py-2 text-xs text-muted-foreground">
        <div>
          <Badge variant="lavender">{market.marketTypeKey}</Badge>{' '}
          <span className="font-medium text-foreground">{market.marketTypeName}</span>
        </div>
        {market.rawMarketLabel && (
          <div className="mt-0.5">Raw: &quot;{market.rawMarketLabel}&quot;</div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Esito</th>
              <th className="py-2 pr-4">Raw</th>
              <th className="py-2 pr-4">Quota</th>
              <th className="py-2 pr-4">Stato</th>
              <th className="py-2 pr-4">Ultimo update</th>
              <th className="py-2">Ver.</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => (
              <tr key={o.canonicalOutcomeId} className="border-b border-border/50">
                <td className="py-2 pr-4">
                  <span className="font-mono text-xs">{o.canonicalKey}</span>{' '}
                  <span className="text-foreground">{o.canonicalLabel}</span>
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{o.rawOutcomeLabel ?? '—'}</td>
                <td className="py-2 pr-4">
                  {o.decimalValue !== null ? (
                    <span className="font-mono font-medium text-foreground">
                      {o.decimalValue.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">— non quotato</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <Badge variant={outcomeStatusVariant(o.oddsStatus ?? o.outcomeStatus)}>
                    {o.oddsStatus ?? o.outcomeStatus}
                  </Badge>
                </td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">
                  {o.lastSeenAt ? formatDateTime(o.lastSeenAt) : '—'}
                </td>
                <td className="py-2 text-xs text-muted-foreground">{o.version ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =====================================================================
// Formatters / variants
// =====================================================================

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatConfidence(v: number): string {
  return (v * 100).toFixed(0) + '%'
}

function matchStatusVariant(
  status: OdMatchStatus,
): 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'auto_confirmed':
    case 'manual_confirmed':
    case 'high_confidence':
      return 'success'
    case 'review_needed':
      return 'warning'
    case 'rejected':
      return 'destructive'
    default:
      return 'outline'
  }
}

function marketStatusVariant(
  status: OdMarketStatus,
): 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'success'
    case 'suspended':
      return 'warning'
    case 'removed':
      return 'destructive'
    case 'settled':
      return 'outline'
    default:
      return 'outline'
  }
}

function outcomeStatusVariant(
  status: OdOutcomeStatus,
): 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
    case 'won':
      return 'success'
    case 'suspended':
      return 'warning'
    case 'removed':
    case 'lost':
      return 'destructive'
    case 'void':
      return 'outline'
    default:
      return 'outline'
  }
}

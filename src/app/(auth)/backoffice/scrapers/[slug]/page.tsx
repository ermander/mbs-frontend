'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { Container } from '@/components/ui/container'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  getCountryFlagUrl,
  getCountryFlagUrlFromIso,
  getItalianCountryName,
} from '@/lib/country-flags'
import {
  extractMessage,
  getBookmakerSummary,
  getScrapedCompetitions,
  getScrapedCompetitionEvents,
  getScrapedEventMarkets,
  getScrapedMarketOutcomes,
  type BookmakerSummaryDto,
  type CompetitionDrilldownItemDto,
  type CompetitionListTotalsDto,
  type EventDrilldownItemDto,
  type MarketDrilldownItemDto,
  type OutcomeDrilldownItemDto,
  type OdMarketStatus,
  type OdMatchStatus,
  type OdOutcomeStatus,
} from '@/services/api/backoffice-scraper-drilldown-client'

const ADAPTER_TYPE_LABELS: Record<string, string> = {
  api: 'API',
  playwright: 'Playwright',
  websocket: 'WebSocket',
}

const TABS = [
  { id: 'config', label: 'Configurazione' },
  { id: 'data', label: 'Dati scrapati' },
] as const

const SEARCH_DEBOUNCE_MS = 350
const SEARCH_MIN_LENGTH = 2

// =====================================================================
// Page
// =====================================================================

export default function ScraperDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [activeTab, setActiveTab] = useState<'config' | 'data'>('config')
  const [summary, setSummary] = useState<BookmakerSummaryDto | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

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

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const enabledSportsLabel = useMemo(() => {
    if (!summary) return ''
    if (summary.enabledSports === null) return `Tutti i mappati (${summary.mappedSports.length})`
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
            <ScrapedDataTree slug={slug} />
          )}
        </>
      ) : null}
    </Container>
  )
}

// =====================================================================
// Configuration tab
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

// =====================================================================
// Tree types and builder
// =====================================================================

const UNKNOWN_COUNTRY = '—'

// UK constituent nations: all share ISO country_code='GB' but must remain
// as separate tree nodes (England, Scotland, Wales, N.Ireland are distinct
// football federations). Map every variant → canonical Italian display name
// so that "England", "Inghilterra", "GBR" all collapse to "Inghilterra",
// and "Scotland"/"Scozia" collapse to "Scozia", etc.
const GB_CONSTITUENT_CANONICAL: Record<string, string> = {
  inghilterra: 'Inghilterra',
  england: 'Inghilterra',
  gbr: 'Inghilterra',
  gb: 'Inghilterra',
  'gran bretagna': 'Inghilterra',
  'great britain': 'Inghilterra',
  'united kingdom': 'Inghilterra',
  scozia: 'Scozia',
  scotland: 'Scozia',
  galles: 'Galles',
  wales: 'Galles',
  'irlanda del nord': 'Irlanda del Nord',
  'northern ireland': 'Irlanda del Nord',
  'irlanda del nord amatori': 'Irlanda del Nord',
}

function getGroupKey(c: CompetitionDrilldownItemDto): string {
  const catNorm = (c.categoryName ?? '').toLowerCase().trim()
  // GB constituent nations: group by canonical display name so that the GB
  // country_code never produces a single mixed "GB" bucket.
  if (c.countryCode === 'GB' || GB_CONSTITUENT_CANONICAL[catNorm] !== undefined) {
    return GB_CONSTITUENT_CANONICAL[catNorm] ?? c.categoryName ?? 'GB'
  }
  return c.countryCode ?? c.categoryName ?? UNKNOWN_COUNTRY
}

type CountryGroup = {
  categoryName: string
  countryCode: string | null
  competitions: CompetitionDrilldownItemDto[]
  totalEventCount: number
}

type SportGroup = {
  sportName: string
  countries: CountryGroup[]
  totalCompetitionCount: number
  totalEventCount: number
}

// When multiple categoryNames share the same countryCode, prefer the most
// descriptive one. ISO-2/3 bare codes (e.g. "GTM", "ISR", "ROU") are not
// considered descriptive — fall back to the Italian ICU name in that case.
function pickDisplayName(names: string[], countryCode: string | null): string {
  if (!countryCode) return names[0] ?? UNKNOWN_COUNTRY
  const preferred = names.find(
    (n) => n.length > 2 && n.toLowerCase() !== countryCode.toLowerCase() && !/^[A-Z]{2,3}$/.test(n), // skip bare ISO-2 / ISO-3 codes
  )
  if (preferred) return preferred
  // All stored names look like ISO codes — resolve to proper Italian display name.
  const italianName = getItalianCountryName(countryCode)
  if (italianName) return italianName
  return names.find((n) => n.length > 2) ?? countryCode
}

function buildTree(competitions: CompetitionDrilldownItemDto[]): SportGroup[] {
  const sportMap = new Map<
    string,
    Map<
      string,
      { comps: CompetitionDrilldownItemDto[]; countryCode: string | null; names: string[] }
    >
  >()

  for (const c of competitions) {
    const groupKey = getGroupKey(c)
    if (!sportMap.has(c.sportName)) sportMap.set(c.sportName, new Map())
    const countryMap = sportMap.get(c.sportName)!
    if (!countryMap.has(groupKey))
      countryMap.set(groupKey, { comps: [], countryCode: c.countryCode ?? null, names: [] })
    const bucket = countryMap.get(groupKey)!
    bucket.comps.push(c)
    // For GB constituent nations always push the canonical name so that
    // pickDisplayName reliably returns it regardless of insertion order.
    const catNorm = (c.categoryName ?? '').toLowerCase().trim()
    const canonicalName = GB_CONSTITUENT_CANONICAL[catNorm] ?? c.categoryName
    if (canonicalName && !bucket.names.includes(canonicalName)) bucket.names.push(canonicalName)
  }

  const sports: SportGroup[] = []
  for (const [sportName, countryMap] of sportMap) {
    const countries: CountryGroup[] = []
    for (const [, { comps, countryCode, names }] of countryMap) {
      const categoryName = pickDisplayName(names, countryCode)
      countries.push({
        categoryName,
        countryCode,
        competitions: comps,
        totalEventCount: comps.reduce((s, c) => s + c.eventCount, 0),
      })
    }
    countries.sort((a, b) => {
      if (a.categoryName === UNKNOWN_COUNTRY) return 1
      if (b.categoryName === UNKNOWN_COUNTRY) return -1
      return a.categoryName.localeCompare(b.categoryName)
    })
    sports.push({
      sportName,
      countries,
      totalCompetitionCount: countries.reduce((s, c) => s + c.competitions.length, 0),
      totalEventCount: countries.reduce((s, c) => s + c.totalEventCount, 0),
    })
  }
  return sports.sort((a, b) => a.sportName.localeCompare(b.sportName))
}

// =====================================================================
// ScrapedDataTree
// =====================================================================

function ScrapedDataTree({ slug }: { slug: string }) {
  const [includePast, setIncludePast] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [competitions, setCompetitions] = useState<CompetitionDrilldownItemDto[] | null>(null)
  const [totals, setTotals] = useState<CompetitionListTotalsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filterSport, setFilterSport] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterName, setFilterName] = useState('')
  const [debouncedFilterName, setDebouncedFilterName] = useState('')

  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set())
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set())

  // Debounce typing in the search field — keeps the previous tree visible while
  // the next request is in flight (see searchLoading vs loading split).
  useEffect(() => {
    if (filterName === debouncedFilterName) return
    const t = setTimeout(() => setDebouncedFilterName(filterName), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filterName, debouncedFilterName])

  const trimmedQuery = debouncedFilterName.trim()
  const hasQuery = trimmedQuery.length >= SEARCH_MIN_LENGTH

  // Changing this key remounts all CompetitionNode components, resetting their lazy-loaded state.
  // Includes debouncedFilterName so toggling the query refreshes per-node state cleanly.
  const nodeResetKey = `${String(includePast)}_${refreshCounter}_${debouncedFilterName}`

  const doLoad = useCallback(
    async (mode: 'full' | 'search') => {
      if (mode === 'search') setSearchLoading(true)
      else setLoading(true)
      setError(null)
      try {
        const qToSend = trimmedQuery.length >= SEARCH_MIN_LENGTH ? trimmedQuery : undefined
        const data = await getScrapedCompetitions(slug, includePast, qToSend)
        setCompetitions(data.competitions)
        setTotals(data.totals)
      } catch (err) {
        setError(extractMessage(err, 'Errore nel caricamento delle competizioni.'))
      } finally {
        if (mode === 'search') setSearchLoading(false)
        else setLoading(false)
      }
    },
    [slug, includePast, trimmedQuery],
  )

  // Initial load + reload on includePast / refresh / query change.
  // We pick "full" vs "search" so that typing in the search field doesn't blank
  // out the tree currently on screen.
  const isInitial = competitions === null
  useEffect(() => {
    void doLoad(isInitial ? 'full' : 'search')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doLoad])

  const handleRefresh = () => {
    setRefreshCounter((c) => c + 1)
    void doLoad('full')
  }

  const availableSports = useMemo(
    () => Array.from(new Set(competitions?.map((c) => c.sportName) ?? [])).sort(),
    [competitions],
  )
  const availableCountries = useMemo(
    () =>
      Array.from(
        new Set(
          competitions
            ?.map((c) => c.categoryName)
            .filter((v): v is string => typeof v === 'string' && v.length > 0) ?? [],
        ),
      ).sort(),
    [competitions],
  )

  // Server filters by name/event-name; here we only further narrow by sport/country.
  const filteredCompetitions = useMemo(() => {
    if (!competitions) return []
    return competitions.filter((c) => {
      if (filterSport && c.sportName !== filterSport) return false
      if (filterCountry && (c.categoryName ?? UNKNOWN_COUNTRY) !== filterCountry) return false
      return true
    })
  }, [competitions, filterSport, filterCountry])

  const hasFilter = filterSport !== '' || filterCountry !== '' || filterName !== ''
  const autoExpandAll = hasFilter
  const tree = useMemo(() => buildTree(filteredCompetitions), [filteredCompetitions])

  const toggleSport = (sportName: string) => {
    setExpandedSports((prev) => {
      const next = new Set(prev)
      if (next.has(sportName)) next.delete(sportName)
      else next.add(sportName)
      return next
    })
  }

  const toggleCountry = (key: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="rounded-md border border-border bg-card">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
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

        <div className="relative flex min-w-[160px] flex-1 items-center">
          <input
            type="text"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Cerca competizione o evento..."
            className="w-full rounded border border-border bg-surface-1 px-2 py-1 pr-7 text-xs text-foreground placeholder:text-muted-foreground"
          />
          {searchLoading && (
            <span className="absolute right-2 text-xs text-muted-foreground" aria-hidden>
              ...
            </span>
          )}
        </div>

        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setFilterSport('')
              setFilterCountry('')
              setFilterName('')
              setDebouncedFilterName('')
            }}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Reset
          </button>
        )}

        <span className="text-xs text-muted-foreground">
          {totals ? (
            <>
              {filteredCompetitions.length} / {totals.totalCompetitions} comp.
              {' · '}
              {hasQuery
                ? `${filteredCompetitions.reduce((s, c) => s + c.matchedEvents.length, 0)} / ${totals.totalEvents} eventi`
                : `${totals.totalEvents} eventi`}
            </>
          ) : (
            filteredCompetitions.length
          )}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
              className="h-3 w-3"
            />
            Mostra anche conclusi
          </label>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Caricamento...' : 'Aggiorna'}
          </button>
        </div>
      </div>

      {/* Tree body */}
      <div className="px-4 py-3">
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        {loading && competitions === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Caricamento...</p>
        ) : totals && totals.totalCompetitions === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nessuna competizione. Prova ad abilitare &apos;Mostra anche conclusi&apos; o verifica la
            configurazione.
          </p>
        ) : !competitions || filteredCompetitions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nessuna competizione corrisponde ai filtri applicati.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {tree.map((sport) => {
              const sportExpanded = autoExpandAll || expandedSports.has(sport.sportName)
              return (
                <li key={sport.sportName}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!autoExpandAll) toggleSport(sport.sportName)
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-muted"
                    aria-expanded={sportExpanded}
                  >
                    <span className="w-3 shrink-0 text-xs text-muted-foreground" aria-hidden>
                      {sportExpanded ? '▾' : '▸'}
                    </span>
                    <span className="font-semibold text-foreground">{sport.sportName}</span>
                    <span className="text-xs text-muted-foreground">
                      · {sport.totalCompetitionCount} comp. · {sport.totalEventCount} eventi
                    </span>
                  </button>

                  {sportExpanded && (
                    <ul className="ml-5 flex flex-col gap-0.5">
                      {sport.countries.map((country) => {
                        const countryKey = `${sport.sportName}::${country.categoryName}`
                        const countryExpanded = autoExpandAll || expandedCountries.has(countryKey)
                        const flagUrl =
                          getCountryFlagUrl(country.categoryName) ??
                          getCountryFlagUrlFromIso(country.countryCode)
                        return (
                          <li key={country.categoryName}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!autoExpandAll) toggleCountry(countryKey)
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
                              aria-expanded={countryExpanded}
                            >
                              <span
                                className="w-3 shrink-0 text-xs text-muted-foreground"
                                aria-hidden
                              >
                                {countryExpanded ? '▾' : '▸'}
                              </span>
                              <span className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm">
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
                              <span className="font-medium text-foreground">
                                {country.categoryName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                · {country.competitions.length} comp. · {country.totalEventCount}{' '}
                                eventi
                              </span>
                            </button>

                            {countryExpanded && (
                              <ul className="ml-5 flex flex-col gap-1 py-1">
                                {country.competitions.map((competition) => (
                                  <CompetitionNode
                                    key={`${nodeResetKey}_${competition.competitionId}`}
                                    slug={slug}
                                    competition={competition}
                                    includePast={includePast}
                                    preloadedEvents={
                                      hasQuery && competition.matchedEvents.length > 0
                                        ? competition.matchedEvents
                                        : undefined
                                    }
                                  />
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// CompetitionNode — lazy-loads events on expand
// =====================================================================

function CompetitionNode({
  slug,
  competition,
  includePast,
  preloadedEvents,
}: {
  slug: string
  competition: CompetitionDrilldownItemDto
  includePast: boolean
  preloadedEvents?: EventDrilldownItemDto[]
}) {
  const hasPreloaded = preloadedEvents !== undefined && preloadedEvents.length > 0
  const [expanded, setExpanded] = useState(hasPreloaded)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EventDrilldownItemDto[] | null>(
    hasPreloaded ? preloadedEvents! : null,
  )

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && events === null && !loading) {
      setLoading(true)
      setError(null)
      try {
        const data = await getScrapedCompetitionEvents(slug, competition.competitionId, includePast)
        setEvents(data.events)
      } catch (err) {
        setError(extractMessage(err, 'Errore nel caricamento degli eventi.'))
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <li className="rounded border border-border/50 bg-background">
      <button
        type="button"
        onClick={() => {
          void toggle()
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
        aria-expanded={expanded}
      >
        <span className="w-3 shrink-0 text-xs text-muted-foreground" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{competition.competitionName}</span>
          {competition.rawCompetitionName &&
            competition.rawCompetitionName !== competition.competitionName && (
              <span className="text-xs text-muted-foreground">
                raw: &quot;{competition.rawCompetitionName}&quot;
              </span>
            )}
        </div>
        <Badge variant="outline">{competition.eventCount} eventi</Badge>
        {hasPreloaded && <Badge variant="success">{preloadedEvents!.length} matchanti</Badge>}
        {loading && <span className="shrink-0 text-xs text-muted-foreground">...</span>}
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-3 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && events === null && (
            <p className="py-3 text-center text-xs text-muted-foreground">Caricamento eventi...</p>
          )}
          {events !== null &&
            (events.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Nessun evento per questa competizione.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {events.map((event) => (
                  <EventNode key={event.eventId} slug={slug} event={event} />
                ))}
              </ul>
            ))}
        </div>
      )}
    </li>
  )
}

// =====================================================================
// EventNode — lazy-loads markets on expand
// =====================================================================

function EventNode({ slug, event }: { slug: string; event: EventDrilldownItemDto }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markets, setMarkets] = useState<MarketDrilldownItemDto[] | null>(null)

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && markets === null && !loading) {
      setLoading(true)
      setError(null)
      try {
        const data = await getScrapedEventMarkets(slug, event.eventId)
        setMarkets(data.markets)
      } catch (err) {
        setError(extractMessage(err, 'Errore nel caricamento dei mercati.'))
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <li className="rounded border border-border/30 bg-surface-1">
      <button
        type="button"
        onClick={() => {
          void toggle()
        }}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 w-3 shrink-0 text-xs text-muted-foreground" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <div className="min-w-[96px] shrink-0 text-xs text-muted-foreground">
          {formatDateTime(event.startTime)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {event.homeName ?? '?'} — {event.awayName ?? '?'}
            </span>
            <Badge variant="outline">{event.status}</Badge>
            <Badge variant={matchStatusVariant(event.matchStatus)}>
              {event.matchStatus} · {formatConfidence(event.matchConfidence)}
            </Badge>
          </div>
          {(event.rawHomeName || event.rawAwayName) && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Raw: &quot;{event.rawHomeName ?? '?'}&quot; vs &quot;{event.rawAwayName ?? '?'}&quot;
            </div>
          )}
        </div>
        {loading && <span className="shrink-0 text-xs text-muted-foreground">...</span>}
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && markets === null && (
            <p className="py-2 text-center text-xs text-muted-foreground">Caricamento mercati...</p>
          )}
          {markets !== null &&
            (markets.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Nessun mercato per questo evento.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {markets.map((market) => (
                  <MarketNode key={market.canonicalMarketId} slug={slug} market={market} />
                ))}
              </ul>
            ))}
        </div>
      )}
    </li>
  )
}

// =====================================================================
// MarketNode — lazy-loads outcomes on expand
// =====================================================================

function MarketNode({ slug, market }: { slug: string; market: MarketDrilldownItemDto }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcomes, setOutcomes] = useState<OutcomeDrilldownItemDto[] | null>(null)

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && outcomes === null && !loading) {
      setLoading(true)
      setError(null)
      try {
        const data = await getScrapedMarketOutcomes(slug, market.canonicalMarketId)
        setOutcomes(data.outcomes)
      } catch (err) {
        setError(extractMessage(err, 'Errore nel caricamento degli esiti.'))
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          void toggle()
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
        aria-expanded={expanded}
      >
        <span className="w-3 shrink-0 text-xs text-muted-foreground" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <Badge variant="lavender">{market.marketTypeKey}</Badge>
        <span className="font-medium text-foreground">{market.marketTypeName}</span>
        <Badge variant={marketStatusVariant(market.marketStatus)}>{market.marketStatus}</Badge>
        <span className="text-xs text-muted-foreground">
          {formatMarketParams(market)} · {market.activeOutcomeCount}/{market.outcomeCount} esiti
        </span>
        {loading && <span className="ml-auto shrink-0 text-xs text-muted-foreground">...</span>}
      </button>

      {expanded && (
        <div className="mb-1.5 ml-5 mt-1">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && outcomes === null && (
            <p className="py-2 text-center text-xs text-muted-foreground">Caricamento esiti...</p>
          )}
          {outcomes !== null &&
            (outcomes.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">Nessun esito configurato.</p>
            ) : (
              <OutcomesInlineTable outcomes={outcomes} />
            ))}
        </div>
      )}
    </li>
  )
}

// =====================================================================
// OutcomesInlineTable
// =====================================================================

function OutcomesInlineTable({ outcomes }: { outcomes: OutcomeDrilldownItemDto[] }) {
  return (
    <div className="overflow-x-auto rounded border border-border/50 bg-background">
      <table className="w-full text-xs">
        <thead className="border-b border-border/50 text-left uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 pr-4">Esito</th>
            <th className="py-1.5 pr-4">Raw</th>
            <th className="py-1.5 pr-4">Quota</th>
            <th className="py-1.5 pr-4">Stato</th>
            <th className="py-1.5">Ultimo update</th>
          </tr>
        </thead>
        <tbody>
          {outcomes.map((o) => (
            <tr key={o.canonicalOutcomeId} className="border-b border-border/30 last:border-0">
              <td className="px-3 py-1.5 pr-4">
                <span className="font-mono">{o.canonicalKey}</span>{' '}
                <span className="text-foreground">{o.canonicalLabel}</span>
              </td>
              <td className="py-1.5 pr-4 text-muted-foreground">{o.rawOutcomeLabel ?? '—'}</td>
              <td className="py-1.5 pr-4">
                {o.decimalValue !== null ? (
                  <span className="font-mono font-medium text-foreground">
                    {o.decimalValue.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-1.5 pr-4">
                <Badge variant={outcomeStatusVariant(o.oddsStatus ?? o.outcomeStatus)}>
                  {o.oddsStatus ?? o.outcomeStatus}
                </Badge>
              </td>
              <td className="py-1.5 text-muted-foreground">
                {o.lastSeenAt ? formatDateTime(o.lastSeenAt) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// =====================================================================
// Formatters / variants
// =====================================================================

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
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

function formatMarketParams(m: MarketDrilldownItemDto): string {
  const parts: string[] = []
  if (m.line !== null) parts.push(`line=${m.line}`)
  if (m.handicap !== null) parts.push(`handicap=${m.handicap}`)
  if (m.teamScope) parts.push(`team=${m.teamScope}`)
  if (m.periodScope) parts.push(`period=${m.periodScope}`)
  return parts.length > 0 ? parts.join(' · ') : 'nessun parametro'
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
    default:
      return 'outline'
  }
}

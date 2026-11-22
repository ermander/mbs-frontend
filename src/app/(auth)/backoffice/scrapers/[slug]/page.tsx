'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react'

import { BoBackLink, BoMono, BoMuted, boLink } from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  GCheckbox,
  GSelect,
  GTabs,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DS_PANEL, DsAlert } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
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

const TABS: { value: 'config' | 'data'; label: string }[] = [
  { value: 'config', label: 'Configurazione' },
  { value: 'data', label: 'Dati scrapati' },
]

/** La freccia di un nodo dell'albero: giù se è aperto. */
function TreeChevron({ open, className }: { open: boolean; className?: string }) {
  const Icon = open ? ChevronDown : ChevronRight
  return <Icon className={cn('h-4 w-4 shrink-0 text-ds-ink-muted', className)} aria-hidden />
}

/** Il bottone che apre un nodo dell'albero: tutta la riga, sunken al passaggio. */
const TREE_ROW =
  'flex w-full items-center gap-2 rounded-ds-sm px-2 text-left transition-colors hover:bg-ds-surface-sunken focus-visible:shadow-ds-focus focus-visible:outline-hidden'

const SEARCH_DEBOUNCE_MS = 350
const SEARCH_MIN_LENGTH = 2

// =====================================================================
// Page
// =====================================================================

// Il dettaglio di uno scraper: configurazione e albero dei dati letti (sport, nazione,
// competizione, evento, mercato, esiti). Dal §14.365 sul design OddWise: Tabs, badge e riquadri
// del design, albero con le frecce lucide e il sunken al passaggio.
export default function ScraperDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [activeTab, setActiveTab] = useState<'config' | 'data'>('config')
  const [summary, setSummary] = useState<BookmakerSummaryDto | null>(null)
  // Il caricamento è derivato: il riepilogo in mano è «per» uno slug, e finché non è quello
  // corrente si sta caricando. Lo stato cambia nei callback della promise, e una risposta
  // arrivata dopo un cambio di slug viene ignorata (react-hooks/set-state-in-effect).
  const [summaryState, setSummaryState] = useState<{ slug: string; error: string | null } | null>(
    null,
  )
  const summaryLoading = summaryState?.slug !== slug
  const summaryError = summaryState?.slug === slug ? summaryState.error : null

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    getBookmakerSummary(slug)
      .then((data) => {
        if (cancelled) return
        setSummary(data)
        setSummaryState({ slug, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setSummary(null)
        setSummaryState({
          slug,
          error: extractMessage(err, 'Errore nel caricamento del bookmaker.'),
        })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const enabledSportsLabel = useMemo(() => {
    if (!summary) return ''
    if (summary.enabledSports === null) return `Tutti i mappati (${summary.mappedSports.length})`
    return summary.enabledSports.join(', ') || 'nessuno'
  }, [summary])

  return (
    <>
      <BoBackLink href="/backoffice/scrapers">Torna alla lista scraper</BoBackLink>

      {summaryLoading ? (
        <BoMuted className="py-6 text-center">Caricamento del bookmaker…</BoMuted>
      ) : summaryError ? (
        <DsAlert>{summaryError}</DsAlert>
      ) : summary ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ds-title m-0">{summary.name}</h1>
            <DsBadge>{ADAPTER_TYPE_LABELS[summary.adapterType] ?? summary.adapterType}</DsBadge>
            <DsBadge tone={summary.scrapeEnabled ? 'profit' : 'neutral'}>
              {summary.scrapeEnabled ? 'Scraping ON' : 'Scraping OFF'}
            </DsBadge>
            {!summary.isActive && <DsBadge tone="loss">Non attivo</DsBadge>}
            <BoMono className="ml-auto">{summary.slug}</BoMono>
          </div>

          <GTabs
            label="Sezioni dello scraper"
            items={TABS}
            value={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'config' ? (
            <ConfigurationTab summary={summary} enabledSportsLabel={enabledSportsLabel} />
          ) : (
            <ScrapedDataTree slug={slug} />
          )}
        </>
      ) : null}
    </>
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
    <div className={cn(DS_PANEL, 'p-5')}>
      <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Row label="Nome" value={summary.name} />
        <Row label="Slug" value={<span className="font-mono text-sm">{summary.slug}</span>} />
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
      <p className="ds-body-sm m-0 mt-5 border-t border-ds-line pt-4 text-ds-ink-muted">
        Per modificare queste impostazioni torna alla{' '}
        <Link href="/backoffice/scrapers" className={boLink}>
          lista scraper
        </Link>
        .
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="ds-label text-ds-ink-muted uppercase">{label}</dt>
      <dd className="m-0 text-sm text-ds-ink">{value}</dd>
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
  // I dati in mano sono «per» una richiesta (slug, conclusi, query, contatore di Aggiorna): il
  // caricamento, pieno o di ricerca, e l'errore sono derivati dal confronto con quella corrente
  // (react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{
    key: string
    refresh: number
    error: string | null
  } | null>(null)

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

  // Initial load + reload on includePast / refresh / query change.
  // "full" (nothing on screen yet, or Aggiorna) blanks the tree; "search" (typing in the
  // search field, includePast) keeps the tree currently on screen.
  const requestKey = `${slug}|${String(includePast)}|${refreshCounter}|${trimmedQuery}`
  const stale = loaded?.key !== requestKey
  const loading = stale && (competitions === null || loaded?.refresh !== refreshCounter)
  const searchLoading = stale && !loading
  const error = loaded != null && !stale ? loaded.error : null

  useEffect(() => {
    let cancelled = false
    const qToSend = trimmedQuery.length >= SEARCH_MIN_LENGTH ? trimmedQuery : undefined
    getScrapedCompetitions(slug, includePast, qToSend)
      .then((data) => {
        if (cancelled) return
        setCompetitions(data.competitions)
        setTotals(data.totals)
        setLoaded({ key: requestKey, refresh: refreshCounter, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setLoaded({
          key: requestKey,
          refresh: refreshCounter,
          error: extractMessage(err, 'Errore nel caricamento delle competizioni.'),
        })
      })
    return () => {
      cancelled = true
    }
  }, [slug, includePast, trimmedQuery, refreshCounter, requestKey])

  const handleRefresh = () => {
    setRefreshCounter((c) => c + 1)
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
    <div className={DS_PANEL}>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ds-line px-5 py-3">
        <GSelect
          id="bo-scraper-sport"
          ariaLabel="Sport"
          size="sm"
          value={filterSport}
          onChange={setFilterSport}
          options={[
            { value: '', label: 'Tutti gli sport' },
            ...availableSports.map((s) => ({ value: s, label: s })),
          ]}
          className="w-40"
        />

        <GSelect
          id="bo-scraper-country"
          ariaLabel="Nazione"
          size="sm"
          value={filterCountry}
          onChange={setFilterCountry}
          options={[
            { value: '', label: 'Tutte le nazioni' },
            ...availableCountries.map((c) => ({ value: c, label: c })),
          ]}
          className="w-44"
        />

        <GTextField
          id="bo-scraper-search"
          ariaLabel="Cerca competizione o evento"
          type="search"
          size="sm"
          value={filterName}
          onChange={setFilterName}
          placeholder="Cerca competizione o evento…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          suffix={searchLoading ? '…' : undefined}
          className="min-w-[180px] flex-1"
        />

        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setFilterSport('')
              setFilterCountry('')
              setFilterName('')
              setDebouncedFilterName('')
            }}
            className={dsButtonClass('ghost', 'sm')}
          >
            Reset
          </button>
        )}

        <span className="ds-body-sm text-ds-ink-muted tabular-nums">
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

        <div className="ml-auto flex items-center gap-4">
          <GCheckbox
            id="bo-scraper-past"
            label="Mostra anche conclusi"
            checked={includePast}
            onChange={setIncludePast}
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-60')}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            {loading ? 'Caricamento…' : 'Aggiorna'}
          </button>
        </div>
      </div>

      {/* Tree body */}
      <div className="px-3 py-3 sm:px-4">
        {error && <DsAlert className="mb-3">{error}</DsAlert>}

        {loading && competitions === null ? (
          <BoMuted className="py-6 text-center">Caricamento delle competizioni…</BoMuted>
        ) : totals && totals.totalCompetitions === 0 ? (
          <p className="py-6 text-center text-sm text-ds-ink-muted">
            Nessuna competizione. Prova ad abilitare &apos;Mostra anche conclusi&apos; o verifica la
            configurazione.
          </p>
        ) : !competitions || filteredCompetitions.length === 0 ? (
          <p className="py-6 text-center text-sm text-ds-ink-muted">
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
                    className={cn(TREE_ROW, 'py-2')}
                    aria-expanded={sportExpanded}
                  >
                    <TreeChevron open={sportExpanded} />
                    <span className="font-semibold text-ds-ink">{sport.sportName}</span>
                    <span className="text-xs text-ds-ink-muted">
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
                              className={cn(TREE_ROW, 'py-1.5')}
                              aria-expanded={countryExpanded}
                            >
                              <TreeChevron open={countryExpanded} />
                              <span className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-ds-xs">
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
                              <span className="font-medium text-ds-ink">
                                {country.categoryName}
                              </span>
                              <span className="text-xs text-ds-ink-muted">
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
    <li className="rounded-ds-sm border border-ds-line bg-ds-surface-raised">
      <button
        type="button"
        onClick={() => {
          void toggle()
        }}
        className={cn(TREE_ROW, 'rounded-ds-sm px-3 py-2')}
        aria-expanded={expanded}
      >
        <TreeChevron open={expanded} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="font-medium text-ds-ink">{competition.competitionName}</span>
          {competition.rawCompetitionName &&
            competition.rawCompetitionName !== competition.competitionName && (
              <span className="text-xs text-ds-ink-muted">
                raw: &quot;{competition.rawCompetitionName}&quot;
              </span>
            )}
        </div>
        <DsBadge>{competition.eventCount} eventi</DsBadge>
        {hasPreloaded && <DsBadge tone="profit">{preloadedEvents!.length} matchanti</DsBadge>}
        {loading && <span className="shrink-0 text-xs text-ds-ink-muted">...</span>}
      </button>

      {expanded && (
        <div className="border-t border-ds-line px-3 py-2">
          {error && <p className="text-sm text-ds-loss">{error}</p>}
          {loading && events === null && (
            <p className="py-3 text-center text-xs text-ds-ink-muted">Caricamento degli eventi…</p>
          )}
          {events !== null &&
            (events.length === 0 ? (
              <p className="py-3 text-center text-xs text-ds-ink-muted">
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
    <li className="rounded-ds-sm border border-ds-line bg-ds-surface">
      <button
        type="button"
        onClick={() => {
          void toggle()
        }}
        className={cn(TREE_ROW, 'items-start px-3 py-2')}
        aria-expanded={expanded}
      >
        <TreeChevron open={expanded} className="mt-0.5" />
        <div className="min-w-[96px] shrink-0 text-xs text-ds-ink-muted">
          {formatDateTime(event.startTime)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ds-ink">
              {event.homeName ?? '?'} — {event.awayName ?? '?'}
            </span>
            <DsBadge>{event.status}</DsBadge>
            <DsBadge tone={matchStatusVariant(event.matchStatus)}>
              {event.matchStatus} · {formatConfidence(event.matchConfidence)}
            </DsBadge>
          </div>
          {(event.rawHomeName || event.rawAwayName) && (
            <div className="mt-0.5 text-xs text-ds-ink-muted">
              Raw: &quot;{event.rawHomeName ?? '?'}&quot; vs &quot;{event.rawAwayName ?? '?'}&quot;
            </div>
          )}
        </div>
        {loading && <span className="shrink-0 text-xs text-ds-ink-muted">...</span>}
      </button>

      {expanded && (
        <div className="border-t border-ds-line px-3 py-2">
          {error && <p className="text-sm text-ds-loss">{error}</p>}
          {loading && markets === null && (
            <p className="py-2 text-center text-xs text-ds-ink-muted">Caricamento dei mercati…</p>
          )}
          {markets !== null &&
            (markets.length === 0 ? (
              <p className="py-2 text-center text-xs text-ds-ink-muted">
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
        className={cn(TREE_ROW, 'py-1.5 text-sm')}
        aria-expanded={expanded}
      >
        <TreeChevron open={expanded} />
        <DsBadge tone="info">{market.marketTypeKey}</DsBadge>
        <span className="font-medium text-ds-ink">{market.marketTypeName}</span>
        <DsBadge tone={marketStatusVariant(market.marketStatus)}>{market.marketStatus}</DsBadge>
        <span className="text-xs text-ds-ink-muted">
          {formatMarketParams(market)} · {market.activeOutcomeCount}/{market.outcomeCount} esiti
        </span>
        {loading && <span className="ml-auto shrink-0 text-xs text-ds-ink-muted">...</span>}
      </button>

      {expanded && (
        <div className="mt-1 mb-1.5 ml-5">
          {error && <p className="text-sm text-ds-loss">{error}</p>}
          {loading && outcomes === null && (
            <p className="py-2 text-center text-xs text-ds-ink-muted">Caricamento degli esiti…</p>
          )}
          {outcomes !== null &&
            (outcomes.length === 0 ? (
              <p className="py-2 text-xs text-ds-ink-muted">Nessun esito configurato.</p>
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
    <div className="overflow-x-auto rounded-ds-sm border border-ds-line bg-ds-surface-raised">
      <table className="w-full text-xs">
        <thead className="ds-label border-b border-ds-line bg-ds-surface-sunken text-left text-ds-ink-muted uppercase">
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
            <tr key={o.canonicalOutcomeId} className="border-b border-ds-line last:border-0">
              <td className="px-3 py-1.5 pr-4">
                <span className="font-mono">{o.canonicalKey}</span>{' '}
                <span className="text-ds-ink">{o.canonicalLabel}</span>
              </td>
              <td className="py-1.5 pr-4 text-ds-ink-muted">{o.rawOutcomeLabel ?? '—'}</td>
              <td className="py-1.5 pr-4">
                {o.decimalValue !== null ? (
                  <span className="font-mono font-medium text-ds-ink">
                    {o.decimalValue.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-ds-ink-muted">—</span>
                )}
              </td>
              <td className="py-1.5 pr-4">
                <DsBadge tone={outcomeStatusVariant(o.oddsStatus ?? o.outcomeStatus)}>
                  {o.oddsStatus ?? o.outcomeStatus}
                </DsBadge>
              </td>
              <td className="py-1.5 text-ds-ink-muted">
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

function matchStatusVariant(status: OdMatchStatus): DsBadgeTone {
  switch (status) {
    case 'auto_confirmed':
    case 'manual_confirmed':
    case 'high_confidence':
      return 'profit'
    case 'review_needed':
      return 'warning'
    case 'rejected':
      return 'loss'
    default:
      return 'neutral'
  }
}

function marketStatusVariant(status: OdMarketStatus): DsBadgeTone {
  switch (status) {
    case 'active':
      return 'profit'
    case 'suspended':
      return 'warning'
    case 'removed':
      return 'loss'
    default:
      return 'neutral'
  }
}

function outcomeStatusVariant(status: OdOutcomeStatus): DsBadgeTone {
  switch (status) {
    case 'active':
    case 'won':
      return 'profit'
    case 'suspended':
      return 'warning'
    case 'removed':
    case 'lost':
      return 'loss'
    default:
      return 'neutral'
  }
}

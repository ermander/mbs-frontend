'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'

import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BoPagination,
} from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { GSelect, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { getMatcherResults, getMatcherMeta } from '@/services/api/matcher-client'
import {
  MatcherCompetitionFilter,
  pruneCompetitionIds,
} from '@/components/strumenti/matcher-competition-filter'
import type {
  MatcherResult,
  MatcherMeta,
  MatcherFilters,
  MatchType,
  MatcherLeg,
} from '@/types/matcher'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 350

const MATCH_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'dutch_2way', label: 'Dutch 2-Way' },
  { value: 'dutch_3way', label: 'Dutch 3-Way' },
  { value: 'back_lay', label: 'Back/Lay' },
]

/** Il rating: da 100 % in su in profit, fra 98 e 100 in warning, sotto in loss. */
function ratingTone(rating: number): DsBadgeTone {
  if (rating >= 100) return 'profit'
  if (rating >= 98) return 'warning'
  return 'loss'
}

const MATCH_TYPE_TONE: Record<string, DsBadgeTone> = {
  dutch_2way: 'info',
  dutch_3way: 'brand',
  back_lay: 'neutral',
}

function matchTypeLabel(type: string) {
  switch (type) {
    case 'dutch_2way':
      return 'Dutch 2W'
    case 'dutch_3way':
      return 'Dutch 3W'
    case 'back_lay':
      return 'Back/Lay'
    default:
      return type
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isLayLeg(leg: MatcherLeg): boolean {
  return leg.outcomeLabel.startsWith('LAY ')
}

/** Una gamba: sito e BACK/LAY, sotto l'esito e la quota (la bancata in loss, come nell'oddsmatcher). */
function LegCell({ leg }: { leg: MatcherLeg }) {
  const lay = isLayLeg(leg)
  return (
    <>
      <div className="flex min-w-[140px] flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-semibold text-ds-ink">{leg.bookmakerName}</span>
        <DsBadge tone={lay ? 'loss' : 'info'} className="h-[18px] px-1.5 text-[10px] font-semibold">
          {lay ? 'LAY' : 'BACK'}
        </DsBadge>
      </div>
      <div className="text-xs whitespace-nowrap text-ds-ink-muted">
        {leg.outcomeLabel.replace(/^(BACK|LAY)\s+/, '')}{' '}
        <span className={cn('font-semibold tabular-nums', lay ? 'text-ds-loss' : 'text-ds-ink')}>
          {leg.odds.toFixed(2)}
        </span>
      </div>
    </>
  )
}

const PERIOD_LABELS: Record<string, string> = {
  first_half: '1° tempo',
  second_half: '2° tempo',
  extra_time: 'suppl.',
}

function marketLabel(
  key: string,
  line: number | null,
  scope?: { handicap?: number | null; periodScope?: string | null; teamScope?: string | null },
) {
  const labels: Record<string, string> = {
    '1x2': '1X2',
    over_under: 'O/U',
    btts: 'GG/NG',
    draw_no_bet: 'DNB',
    odd_even: 'Pari/Dispari',
    handicap_european: 'Handicap EU',
    handicap_asian: 'Handicap AS',
  }
  let label = labels[key] ?? key
  if (line != null) label += ` ${line}`
  const handicap = scope?.handicap
  if (handicap != null) label += ` ${handicap > 0 ? '+' : ''}${handicap}`
  if (scope?.teamScope) label += ` ${scope.teamScope}`
  const period = scope?.periodScope
  if (period && period !== 'full_time') label += ` · ${PERIOD_LABELS[period] ?? period}`
  return label
}

// I risultati del matcher per l'amministratore, senza polling: si ricarica con «Aggiorna». Dal
// §14.365 sul design OddWise: filtri GSelect e GTextField, tabella e badge del design.
export default function MatcherPage() {
  const [results, setResults] = useState<MatcherResult[]>([])
  const [meta, setMeta] = useState<MatcherMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null)

  // Filters
  const [sport, setSport] = useState('')
  const [matchType, setMatchType] = useState('')
  const [marketTypeFilter, setMarketTypeFilter] = useState('')
  const [minRating, setMinRating] = useState('')
  const [bookmaker, setBookmaker] = useState('')
  const [competitionIds, setCompetitionIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Il menu delle competizioni si apre qui dentro e non nel body, così prende la palette chiara
  // del design (nel body restava scuro).
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null)

  const setFilter =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value)
      setPage(0)
    }

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [search])

  const toggleCompetition = (id: string) => {
    setCompetitionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setPage(0)
  }

  const loadMeta = useCallback(async () => {
    try {
      const m = await getMatcherMeta()
      setMeta(m)
      // A selected competition that left the results (its rows purged) leaves the
      // filter too: the dropdown could not show it any more.
      if (m.competitions) {
        const known = new Set(m.competitions.map((c) => c.id))
        setCompetitionIds((prev) =>
          prev.every((id) => known.has(id)) ? prev : prev.filter((id) => known.has(id)),
        )
      }
    } catch {
      /* ignore */
    }
  }, [])

  const loadResults = useCallback(async () => {
    setLoading(true)
    try {
      const filters: MatcherFilters = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort_by: 'rating',
        sort_dir: 'DESC',
      }
      if (sport) filters.sport = sport
      if (matchType) filters.match_type = matchType as MatchType
      if (marketTypeFilter) filters.market_type = marketTypeFilter
      // Il campo è di testo: si accetta anche la virgola, e un valore che non è un numero non filtra.
      const rating = parseFloat(minRating.replace(',', '.'))
      if (Number.isFinite(rating)) filters.min_rating = rating
      if (bookmaker) filters.bookmaker = bookmaker
      if (competitionIds.length > 0) filters.competitions = competitionIds.join(',')
      if (debouncedSearch) filters.search = debouncedSearch

      const res = await getMatcherResults(filters)
      setResults(res.results)
      setTotal(res.total)
      setCalculatedAt(res.calculatedAt)
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [
    page,
    sport,
    matchType,
    marketTypeFilter,
    minRating,
    bookmaker,
    competitionIds,
    debouncedSearch,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens asynchronously after await, not synchronously
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens asynchronously after await, not synchronously
    loadResults()
  }, [loadResults])

  // No polling (product rule, 2026-09-27): the page loads on mount and on every
  // filter change, and the admin reloads on demand with «Aggiorna».
  const refresh = useCallback(() => {
    void loadResults()
    void loadMeta()
  }, [loadResults, loadMeta])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const legCell = (leg: MatcherLeg | undefined) =>
    leg ? <LegCell leg={leg} /> : <span className="text-ds-ink-faint">—</span>

  return (
    <>
      <DsPageHeader
        title="Matcher"
        description={`${total.toLocaleString('it-IT')} risultati${calculatedAt ? ` · aggiornato ${formatDate(calculatedAt)}` : ''}`}
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className={cn(dsButtonClass('secondary', 'md'), 'disabled:opacity-60')}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            Aggiorna
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <GSelect
          id="bo-matcher-sport"
          ariaLabel="Sport"
          size="sm"
          value={sport}
          onChange={(value) => {
            setFilter(setSport)(value)
            setCompetitionIds((prev) =>
              pruneCompetitionIds(prev, meta?.competitions, { sport: value }),
            )
          }}
          options={[
            { value: '', label: 'Tutti gli sport' },
            ...(meta?.sports ?? []).map((s) => ({ value: s, label: s })),
          ]}
        />

        <MatcherCompetitionFilter
          className="col-span-2"
          competitions={meta?.competitions}
          scope={{ sport }}
          selectedIds={competitionIds}
          onToggle={toggleCompetition}
          portalContainer={portalEl}
        />

        <GSelect
          id="bo-matcher-type"
          ariaLabel="Tipo"
          size="sm"
          value={matchType}
          onChange={setFilter(setMatchType)}
          options={MATCH_TYPES}
        />

        <GSelect
          id="bo-matcher-market"
          ariaLabel="Mercato"
          size="sm"
          value={marketTypeFilter}
          onChange={setFilter(setMarketTypeFilter)}
          options={[
            { value: '', label: 'Tutti i mercati' },
            ...(meta?.marketTypes ?? []).map((m) => ({ value: m, label: marketLabel(m, null) })),
          ]}
        />

        <GTextField
          id="bo-matcher-rating"
          ariaLabel="Rating minimo"
          size="sm"
          placeholder="Rating min"
          value={minRating}
          onChange={setFilter(setMinRating)}
          suffix="%"
          inputProps={{ inputMode: 'decimal' }}
        />

        <GSelect
          id="bo-matcher-bookmaker"
          ariaLabel="Bookmaker"
          size="sm"
          value={bookmaker}
          onChange={setFilter(setBookmaker)}
          options={[
            { value: '', label: 'Tutti i bookmaker' },
            ...(meta?.bookmakers ?? []).map((b) => ({ value: b.slug, label: b.name })),
          ]}
        />

        <GTextField
          id="bo-matcher-search"
          ariaLabel="Cerca evento"
          type="search"
          size="sm"
          placeholder="Cerca evento…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          value={search}
          onChange={setFilter(setSearch)}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Rating</th>
              <th className={BO_TH}>Tipo</th>
              <th className={BO_TH}>Evento</th>
              <th className={BO_TH}>Kickoff</th>
              <th className={BO_TH}>Mercato</th>
              <th className={BO_TH}>Leg 1</th>
              <th className={BO_TH}>Leg 2</th>
              <th className={BO_TH}>Leg 3</th>
            </tr>
          </thead>
          <tbody>
            {loading && results.length === 0 ? (
              <tr>
                <td colSpan={8} className={BO_EMPTY_CELL}>
                  Caricamento dei risultati…
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className={BO_EMPTY_CELL}>
                  Nessun risultato.
                </td>
              </tr>
            ) : (
              results.map((r, i) => (
                <tr key={i} className={cn(BO_ROW, 'align-top')}>
                  <td className={BO_TD}>
                    <DsBadge tone={ratingTone(r.rating)} className="font-semibold tabular-nums">
                      {r.rating.toFixed(2)}%
                    </DsBadge>
                  </td>
                  <td className={BO_TD}>
                    <DsBadge tone={MATCH_TYPE_TONE[r.matchType] ?? 'neutral'}>
                      {matchTypeLabel(r.matchType)}
                    </DsBadge>
                  </td>
                  <td className={cn(BO_TD, 'min-w-[200px]')}>
                    <div className="font-semibold text-ds-ink">
                      {r.homeName} vs {r.awayName}
                    </div>
                    <div className="ds-caption text-ds-ink-muted">
                      {r.sportName} · {r.competitionName}
                    </div>
                  </td>
                  <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted tabular-nums')}>
                    {formatDate(r.startTime)}
                  </td>
                  <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink')}>
                    {marketLabel(r.marketTypeKey, r.line, r)}
                  </td>
                  <td className={BO_TD}>{legCell(r.legs[0])}</td>
                  <td className={BO_TD}>{legCell(r.legs[1])}</td>
                  <td className={BO_TD}>{legCell(r.legs[2])}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div ref={setPortalEl} className="pointer-events-none fixed inset-0 z-50" />

      {totalPages > 1 && (
        <BoPagination
          label={`Pagina ${page + 1} di ${totalPages}`}
          prevDisabled={page === 0}
          nextDisabled={page >= totalPages - 1}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}
    </>
  )
}

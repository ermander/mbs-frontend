'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { getMatcherResults, getMatcherMeta } from '@/services/api/matcher-client'
import type {
  MatcherResult,
  MatcherMeta,
  MatcherFilters,
  MatchType,
  MatcherLeg,
} from '@/types/matcher'

const PAGE_SIZE = 50
// Fase 2: results follow ingestion by seconds on the backend, so the page polls
// every 20 s (first page, visible tab only) instead of once a minute.
const AUTO_REFRESH_MS = 20_000
const SEARCH_DEBOUNCE_MS = 350
// A price older than this is worth a second look before betting on it.
const STALE_LEG_SECONDS = 180
const OLD_LEG_SECONDS = 600

const MATCH_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'back_lay', label: 'Back / Lay' },
  { value: 'dutch_2way', label: 'Dutching 2W' },
  { value: 'dutch_3way', label: 'Dutching 3W' },
]

function ratingBadge(rating: number) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums'
  if (rating >= 100) return `${base} bg-emerald-500/15 text-emerald-400`
  if (rating >= 95) return `${base} bg-green-500/15 text-green-400`
  if (rating >= 90) return `${base} bg-amber-500/15 text-amber-400`
  if (rating >= 80) return `${base} bg-orange-500/15 text-orange-400`
  return `${base} bg-red-500/15 text-red-400`
}

function matchTypeBadge(type: MatchType) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
  switch (type) {
    case 'dutch_2way':
      return `${base} bg-blue-500/15 text-blue-400`
    case 'dutch_3way':
      return `${base} bg-purple-500/15 text-purple-400`
    case 'back_lay':
      return `${base} bg-teal-500/15 text-teal-400`
    default:
      return `${base} bg-muted text-muted-foreground`
  }
}

function matchTypeLabel(type: MatchType): string {
  switch (type) {
    case 'dutch_2way':
      return 'Dutch 2W'
    case 'dutch_3way':
      return 'Dutch 3W'
    case 'back_lay':
      return 'Back/Lay'
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

function marketLabel(key: string, line: number | null) {
  const labels: Record<string, string> = {
    '1x2': '1X2',
    over_under: 'O/U',
    btts: 'GG/NG',
    draw_no_bet: 'DNB',
    odd_even: 'Pari/Dispari',
    handicap_european: 'Handicap EU',
    handicap_asian: 'Handicap AS',
    double_chance: 'Doppia Chance',
  }
  const base = labels[key] ?? key
  return line != null ? `${base} ${line}` : base
}

function isLayLeg(leg: MatcherLeg): boolean {
  return leg.outcomeLabel.startsWith('LAY ')
}

/** Seconds elapsed since an ISO timestamp, never negative. */
function ageSeconds(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000))
}

function ageLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
}

function ageClass(seconds: number): string {
  if (seconds < STALE_LEG_SECONDS) return 'text-emerald-400'
  if (seconds < OLD_LEG_SECONDS) return 'text-amber-400'
  return 'text-red-400'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** A ticking clock so the ages on screen keep moving between polls. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
}

function LegCell({ leg, now }: { leg: MatcherLeg; now: number }) {
  const lay = isLayLeg(leg)
  const oddsColor = lay ? 'text-pink-400' : 'text-blue-400'
  const tagClass = lay
    ? 'bg-pink-500/15 text-pink-400 border-pink-500/20'
    : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
  const tagLabel = lay ? 'LAY' : 'BACK'

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium">{leg.bookmakerName}</span>
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-bold ${tagClass}`}
        >
          {tagLabel}
        </span>
      </div>
      <div className="text-xs">
        {leg.outcomeLabel.replace(/^(BACK|LAY)\s+/, '')}{' '}
        <span className={`font-bold ${oddsColor}`}>{leg.odds.toFixed(2)}</span>
      </div>
      {leg.lastSeenAt && (
        <div
          className={`text-[10px] tabular-nums ${ageClass(ageSeconds(leg.lastSeenAt, now))}`}
          title={`Quota confermata dal bookmaker alle ${formatTime(leg.lastSeenAt)}`}
        >
          vista {ageLabel(ageSeconds(leg.lastSeenAt, now))} fa
        </div>
      )}
    </div>
  )
}

export function OddsScannerV2Table() {
  const [results, setResults] = useState<MatcherResult[]>([])
  const [meta, setMeta] = useState<MatcherMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null)
  const now = useNow(5_000)

  // Filters (all server-side)
  const [sport, setSport] = useState('')
  const [matchType, setMatchType] = useState('')
  const [marketTypeFilter, setMarketTypeFilter] = useState('')
  const [nation, setNation] = useState('')
  const [bookmaker, setBookmaker] = useState('')
  const [minRating, setMinRating] = useState('')
  const [maxRating, setMaxRating] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startFrom, setStartFrom] = useState('')
  const [startTo, setStartTo] = useState('')

  // Reset page whenever a filter changes.
  const setFilter =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value)
      setPage(0)
    }

  // Debounce the search input so we don't hammer the API on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [search])

  const loadMeta = useCallback(async () => {
    try {
      const m = await getMatcherMeta()
      setMeta(m)
    } catch {
      /* ignore: meta is non-critical */
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
      if (nation) filters.nation = nation
      if (bookmaker) filters.bookmaker = bookmaker
      if (minRating) filters.min_rating = parseFloat(minRating)
      if (maxRating) filters.max_rating = parseFloat(maxRating)
      if (debouncedSearch) filters.search = debouncedSearch
      if (startFrom) filters.start_time_from = new Date(startFrom).toISOString()
      if (startTo) filters.start_time_to = new Date(startTo).toISOString()

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
    nation,
    bookmaker,
    minRating,
    maxRating,
    debouncedSearch,
    startFrom,
    startTo,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadResults()
  }, [loadResults])

  // Auto-refresh first page only, when tab is visible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (page > 0) return
      if (typeof document !== 'undefined' && document.hidden) return
      void loadResults()
      void loadMeta()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [loadResults, loadMeta, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total.toLocaleString('it-IT')} risultati
          {calculatedAt && (
            <>
              {' — aggiornato '}
              <span
                className={`tabular-nums ${ageClass(ageSeconds(calculatedAt, now))}`}
                title={formatDate(calculatedAt)}
              >
                {ageLabel(ageSeconds(calculatedAt, now))} fa
              </span>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={matchType}
          onChange={(e) => setFilter(setMatchType)(e.target.value)}
        >
          {MATCH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={sport}
          onChange={(e) => setFilter(setSport)(e.target.value)}
        >
          <option value="">Tutti gli sport</option>
          {meta?.sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={nation}
          onChange={(e) => setFilter(setNation)(e.target.value)}
        >
          <option value="">Tutte le nazioni</option>
          {meta?.nations?.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={marketTypeFilter}
          onChange={(e) => setFilter(setMarketTypeFilter)(e.target.value)}
        >
          <option value="">Tutti i mercati</option>
          {meta?.marketTypes.map((m) => (
            <option key={m} value={m}>
              {marketLabel(m, null)}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={bookmaker}
          onChange={(e) => setFilter(setBookmaker)(e.target.value)}
        >
          <option value="">Tutti i bookmaker</option>
          {meta?.bookmakers.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Cerca evento…"
          value={search}
          onChange={(e) => setFilter(setSearch)(e.target.value)}
        />

        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Rating min"
          value={minRating}
          onChange={(e) => setFilter(setMinRating)(e.target.value)}
          step="0.5"
        />

        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Rating max"
          value={maxRating}
          onChange={(e) => setFilter(setMaxRating)(e.target.value)}
          step="0.5"
        />

        <input
          type="datetime-local"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={startFrom}
          onChange={(e) => setFilter(setStartFrom)(e.target.value)}
          title="Dal"
        />

        <input
          type="datetime-local"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={startTo}
          onChange={(e) => setFilter(setStartTo)(e.target.value)}
          title="Al"
        />
      </div>

      {/* Results table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Evento</th>
              <th className="px-3 py-2">Kickoff</th>
              <th className="px-3 py-2">Mercato</th>
              <th className="px-3 py-2">Leg 1</th>
              <th className="px-3 py-2">Leg 2</th>
              <th className="px-3 py-2">Leg 3</th>
            </tr>
          </thead>
          <tbody>
            {loading && results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Caricamento…
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Nessun risultato
                </td>
              </tr>
            ) : (
              results.map((r, i) => (
                <tr key={`${r.eventId}-${r.matchType}-${i}`} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <span className={ratingBadge(r.rating)}>{r.rating.toFixed(2)}%</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={matchTypeBadge(r.matchType)}>
                      {matchTypeLabel(r.matchType)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {r.homeName} vs {r.awayName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.sportName}
                      {r.nationName ? ` · ${r.nationName}` : ''}
                      {' — '}
                      {r.competitionName}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(r.startTime)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {marketLabel(r.marketTypeKey, r.line)}
                  </td>
                  <td className="px-3 py-2">
                    {r.legs[0] ? (
                      <LegCell leg={r.legs[0]} now={now} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.legs[1] ? (
                      <LegCell leg={r.legs[1]} now={now} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.legs[2] ? (
                      <LegCell leg={r.legs[2]} now={now} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Pagina {page + 1} di {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-1 hover:bg-muted disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Precedente
            </button>
            <button
              className="rounded-md border px-3 py-1 hover:bg-muted disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Successiva
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

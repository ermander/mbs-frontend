'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import { getMatcherResults, getMatcherMeta } from '@/services/api/matcher-client'
import type { MatcherResult, MatcherMeta, MatcherFilters, MatchType } from '@/types/matcher'

const PAGE_SIZE = 50
const AUTO_REFRESH_MS = 60_000

const MATCH_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'dutch_2way', label: 'Dutch 2-Way' },
  { value: 'dutch_3way', label: 'Dutch 3-Way' },
  { value: 'back_lay', label: 'Back/Lay' },
]

function ratingBadge(rating: number) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums'
  if (rating > 0) return `${base} bg-emerald-500/15 text-emerald-400`
  if (rating > -2) return `${base} bg-amber-500/15 text-amber-400`
  return `${base} bg-red-500/15 text-red-400`
}

function matchTypeBadge(type: string) {
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

function marketLabel(key: string, line: number | null) {
  const labels: Record<string, string> = {
    '1x2': '1X2',
    over_under: 'O/U',
    btts: 'GG/NG',
    draw_no_bet: 'DNB',
    odd_even: 'Pari/Dispari',
    handicap_european: 'Handicap EU',
    handicap_asian: 'Handicap AS',
  }
  const base = labels[key] ?? key
  return line != null ? `${base} ${line}` : base
}

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
  const [minRating, setMinRating] = useState('-5')
  const [bookmaker, setBookmaker] = useState('')
  const [search, setSearch] = useState('')

  const setFilter =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value)
      setPage(0)
    }

  const loadMeta = useCallback(async () => {
    try {
      const m = await getMatcherMeta()
      setMeta(m)
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
      if (minRating) filters.min_rating = parseFloat(minRating)
      if (bookmaker) filters.bookmaker = bookmaker
      if (search) filters.search = search

      const res = await getMatcherResults(filters)
      setResults(res.results)
      setTotal(res.total)
      setCalculatedAt(res.calculatedAt)
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [page, sport, matchType, marketTypeFilter, minRating, bookmaker, search])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens asynchronously after await, not synchronously
  useEffect(() => {
    loadMeta()
  }, [loadMeta])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens asynchronously after await, not synchronously
  useEffect(() => {
    loadResults()
  }, [loadResults])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadResults()
      loadMeta()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [loadResults, loadMeta])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matcher</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} risultati
            {calculatedAt && ` — aggiornato ${formatDate(calculatedAt)}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
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

        <input
          type="number"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Rating min"
          value={minRating}
          onChange={(e) => setFilter(setMinRating)(e.target.value)}
          step="0.5"
        />

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
          placeholder="Cerca evento..."
          value={search}
          onChange={(e) => setFilter(setSearch)(e.target.value)}
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
                  Caricamento...
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
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <span className={ratingBadge(r.rating)}>
                      {r.rating >= 0 ? '+' : ''}
                      {r.rating.toFixed(2)}%
                    </span>
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
                      {r.sportName} — {r.competitionName}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(r.startTime)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {marketLabel(r.marketTypeKey, r.line)}
                  </td>
                  {/* Leg 1 */}
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.legs[0]?.bookmakerName}</div>
                    <div className="text-xs">
                      {r.legs[0]?.outcomeLabel}{' '}
                      <span className="font-bold text-blue-400">{r.legs[0]?.odds.toFixed(2)}</span>
                    </div>
                  </td>
                  {/* Leg 2 */}
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.legs[1]?.bookmakerName}</div>
                    <div className="text-xs">
                      {r.legs[1]?.outcomeLabel}{' '}
                      <span className="font-bold text-blue-400">{r.legs[1]?.odds.toFixed(2)}</span>
                    </div>
                  </td>
                  {/* Leg 3 */}
                  <td className="px-3 py-2">
                    {r.legs[2] ? (
                      <>
                        <div className="font-medium">{r.legs[2].bookmakerName}</div>
                        <div className="text-xs">
                          {r.legs[2].outcomeLabel}{' '}
                          <span className="font-bold text-blue-400">
                            {r.legs[2].odds.toFixed(2)}
                          </span>
                        </div>
                      </>
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
    </Container>
  )
}

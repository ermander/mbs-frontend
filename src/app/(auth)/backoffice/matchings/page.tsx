'use client'

import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import { getMatchings, getEventBookmakers } from '@/services/api/odds-collection-client'
import {
  getScrapers,
  getCanonicalSports,
  type BackofficeScraper,
  type CanonicalSport,
} from '@/services/api/backoffice-scrapers-client'
import type { EventMatching, EventBookmaker } from '@/types/odds-collection'

const MATCH_STATUSES = [
  { value: '', label: 'Tutti gli status' },
  { value: 'auto_confirmed', label: 'Auto Confirmed' },
  { value: 'high_confidence', label: 'High Confidence' },
  { value: 'review_needed', label: 'Review Needed' },
  { value: 'manual_confirmed', label: 'Manual Confirmed' },
  { value: 'rejected', label: 'Rejected' },
]

const MATCH_METHODS = [
  { value: '', label: 'Tutti i metodi' },
  { value: 'exact_name_time', label: 'Exact Name+Time' },
  { value: 'fuzzy', label: 'Fuzzy' },
  { value: 'fuzzy_inverted', label: 'Fuzzy Inverted' },
  { value: 'alias', label: 'Alias' },
  { value: 'manual', label: 'Manual' },
  { value: 'bookmaker_created', label: 'Bookmaker Created' },
  { value: 'none', label: 'None' },
]

const PAGE_SIZE = 50

function statusBadge(status: string) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
  switch (status) {
    case 'auto_confirmed':
    case 'manual_confirmed':
      return `${base} bg-emerald-500/15 text-emerald-400`
    case 'high_confidence':
      return `${base} bg-blue-500/15 text-blue-400`
    case 'review_needed':
      return `${base} bg-amber-500/15 text-amber-400`
    case 'rejected':
      return `${base} bg-red-500/15 text-red-400`
    default:
      return `${base} bg-muted text-muted-foreground`
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MatchingsPage() {
  const [matchings, setMatchings] = useState<EventMatching[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [bookmaker, setBookmaker] = useState('')
  const [matchStatus, setMatchStatus] = useState('')
  const [matchMethod, setMatchMethod] = useState('')
  const [sport, setSport] = useState('')
  const [offset, setOffset] = useState(0)

  // Reference data for filters
  const [bookmakers, setBookmakers] = useState<BackofficeScraper[]>([])
  const [sports, setSports] = useState<CanonicalSport[]>([])

  // Expanded event detail
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [eventBookmakers, setEventBookmakers] = useState<EventBookmaker[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Load reference data once
  useEffect(() => {
    Promise.all([getScrapers(), getCanonicalSports()])
      .then(([b, s]) => {
        setBookmakers(b)
        setSports(s)
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMatchings({
        limit: PAGE_SIZE,
        offset,
        bookmaker: bookmaker || undefined,
        match_status: matchStatus || undefined,
        match_method: matchMethod || undefined,
        sport: sport || undefined,
      })
      setMatchings(data.matchings)
      setTotal(data.total)
    } catch {
      setError('Errore nel caricamento dei matchings.')
    } finally {
      setLoading(false)
    }
  }, [offset, bookmaker, matchStatus, matchMethod, sport])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Reset offset when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setOffset(0)
  }

  const handleRowDoubleClick = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null)
      return
    }
    setExpandedEventId(eventId)
    setLoadingDetail(true)
    try {
      const bks = await getEventBookmakers(eventId)
      setEventBookmakers(bks)
    } catch {
      setEventBookmakers([])
    } finally {
      setLoadingDetail(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <Container>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Event Matchings</h2>
        <p className="text-sm text-muted-foreground">
          Tutti i matching tra eventi bookmaker ed eventi canonici. Doppio click su una riga per
          vedere tutti i bookmaker associati.
          {!loading && <span className="ml-2 font-medium text-foreground">{total} risultati</span>}
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={bookmaker}
          onChange={(e) => handleFilterChange(setBookmaker)(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Tutti i bookmaker</option>
          {bookmakers.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={matchStatus}
          onChange={(e) => handleFilterChange(setMatchStatus)(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {MATCH_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={matchMethod}
          onChange={(e) => handleFilterChange(setMatchMethod)(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {MATCH_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={sport}
          onChange={(e) => handleFilterChange(setSport)(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Tutti gli sport</option>
          {sports.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Evento Canonico</th>
              <th className="px-3 py-2">Bookmaker</th>
              <th className="px-3 py-2">Nomi Bookmaker</th>
              <th className="px-3 py-2">Competizione</th>
              <th className="px-3 py-2">Sport</th>
              <th className="px-3 py-2">Data Evento</th>
              <th className="px-3 py-2">Metodo</th>
              <th className="px-3 py-2 text-center">Confidence</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Matched At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : matchings.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Nessun matching trovato.
                </td>
              </tr>
            ) : (
              matchings.map((m) => {
                const isExpanded = expandedEventId === m.eventId
                return (
                  <MatchingRow
                    key={m.id}
                    matching={m}
                    isExpanded={isExpanded}
                    loadingDetail={loadingDetail}
                    eventBookmakers={eventBookmakers}
                    onDoubleClick={() => handleRowDoubleClick(m.eventId)}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Pagina {currentPage} di {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-40"
            >
              Precedente
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-40"
            >
              Successiva
            </button>
          </div>
        </div>
      )}
    </Container>
  )
}

// --- Row component with expand ---

function MatchingRow({
  matching: m,
  isExpanded,
  loadingDetail,
  eventBookmakers,
  onDoubleClick,
}: {
  matching: EventMatching
  isExpanded: boolean
  loadingDetail: boolean
  eventBookmakers: EventBookmaker[]
  onDoubleClick: () => void
}) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/20" onDoubleClick={onDoubleClick}>
        <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">
          {m.canonicalHome ?? '?'} - {m.canonicalAway ?? '?'}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-foreground">{m.bookmakerName}</td>
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
          {m.bookmakerHomeName ?? '?'} - {m.bookmakerAwayName ?? '?'}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{m.competitionName}</td>
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{m.sportName}</td>
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
          {formatDate(m.startTime)}
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {m.matchMethod}
          </code>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-foreground">
          {(m.matchConfidence * 100).toFixed(0)}%
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          <span className={statusBadge(m.matchStatus)}>{m.matchStatus.replace(/_/g, ' ')}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
          {formatDate(m.matchedAt)}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={10} className="border-t border-border bg-muted/10 px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bookmaker associati a: {m.canonicalHome ?? '?'} - {m.canonicalAway ?? '?'}
            </div>
            {loadingDetail ? (
              <p className="text-xs text-muted-foreground">Caricamento...</p>
            ) : eventBookmakers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessun bookmaker trovato.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-border">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-1.5">Bookmaker</th>
                      <th className="px-3 py-1.5">Nome Home</th>
                      <th className="px-3 py-1.5">Nome Away</th>
                      <th className="px-3 py-1.5">Competizione</th>
                      <th className="px-3 py-1.5">Metodo</th>
                      <th className="px-3 py-1.5 text-center">Confidence</th>
                      <th className="px-3 py-1.5">Status</th>
                      <th className="px-3 py-1.5">Matched At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {eventBookmakers.map((bk) => (
                      <tr key={bk.id} className="hover:bg-muted/20">
                        <td className="whitespace-nowrap px-3 py-1.5 font-medium text-foreground">
                          {bk.bookmakerName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-foreground">
                          {bk.bookmakerHomeName ?? '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-foreground">
                          {bk.bookmakerAwayName ?? '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                          {bk.bookmakerCompetitionName ?? '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5">
                          <code className="rounded bg-muted px-1 py-0.5 font-mono">
                            {bk.matchMethod}
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-center font-mono text-foreground">
                          {(bk.matchConfidence * 100).toFixed(0)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5">
                          <span className={statusBadge(bk.matchStatus)}>
                            {bk.matchStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                          {formatDate(bk.matchedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

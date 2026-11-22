'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BoCode,
  BoMuted,
  BoPagination,
  codeLabel,
  matchStatusTone,
} from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { GIconButton, GSelect } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
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
  { value: 'exact_name_day', label: 'Exact Name+Day (orario segnaposto)' },
  { value: 'fuzzy', label: 'Fuzzy' },
  { value: 'fuzzy_inverted', label: 'Fuzzy Inverted' },
  { value: 'alias', label: 'Alias' },
  { value: 'manual', label: 'Manual' },
  { value: 'bookmaker_created', label: 'Bookmaker Created' },
  { value: 'none', label: 'None' },
]

const PAGE_SIZE = 50

function StatusBadge({ status }: { status: string }) {
  return <DsBadge tone={matchStatusTone(status)}>{codeLabel(status)}</DsBadge>
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

// Tutti gli abbinamenti fra eventi dei bookmaker ed eventi canonici. Dal §14.365 sul design
// OddWise: filtri GSelect, tabella del Backoffice e il dettaglio dei bookmaker dell'evento che si
// apre anche col pulsante a inizio riga (prima solo col doppio clic, fuori dalla tastiera).
export default function MatchingsPage() {
  const [matchings, setMatchings] = useState<EventMatching[]>([])
  const [total, setTotal] = useState(0)

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

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      bookmaker: bookmaker || undefined,
      match_status: matchStatus || undefined,
      match_method: matchMethod || undefined,
      sport: sport || undefined,
    }),
    [offset, bookmaker, matchStatus, matchMethod, sport],
  )

  // Il caricamento è derivato: la tabella in mano è «per» una query, e finché non è quella
  // corrente si sta caricando; l'errore vale solo per la query corrente. Lo stato cambia nei
  // callback della promise, e una risposta arrivata dopo un cambio di filtri viene ignorata
  // (react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{ query: typeof query; error: string | null } | null>(null)
  const loading = loaded?.query !== query
  const error = loaded?.query === query ? loaded.error : null

  useEffect(() => {
    let cancelled = false
    getMatchings(query)
      .then((data) => {
        if (cancelled) return
        setMatchings(data.matchings)
        setTotal(data.total)
        setLoaded({ query, error: null })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ query, error: 'Errore nel caricamento dei matchings.' })
      })
    return () => {
      cancelled = true
    }
  }, [query])

  // Reset offset when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setOffset(0)
  }

  const toggleEvent = async (eventId: string) => {
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

  const filters = [
    {
      id: 'bo-mt-bookmaker',
      label: 'Bookmaker',
      value: bookmaker,
      set: setBookmaker,
      options: [
        { value: '', label: 'Tutti i bookmaker' },
        ...bookmakers.map((b) => ({ value: b.slug, label: b.name })),
      ],
    },
    {
      id: 'bo-mt-status',
      label: 'Status',
      value: matchStatus,
      set: setMatchStatus,
      options: MATCH_STATUSES,
    },
    {
      id: 'bo-mt-method',
      label: 'Metodo',
      value: matchMethod,
      set: setMatchMethod,
      options: MATCH_METHODS,
    },
    {
      id: 'bo-mt-sport',
      label: 'Sport',
      value: sport,
      set: setSport,
      options: [
        { value: '', label: 'Tutti gli sport' },
        ...sports.map((s) => ({ value: s.name, label: s.name })),
      ],
    },
  ]

  return (
    <>
      <DsPageHeader
        title="Event Matchings"
        description="Tutti i matching tra eventi bookmaker ed eventi canonici. Apri una riga per vedere tutti i bookmaker associati all'evento."
      />

      <div className="flex flex-wrap items-center gap-3">
        {filters.map((f) => (
          <GSelect
            key={f.id}
            id={f.id}
            ariaLabel={f.label}
            size="sm"
            value={f.value}
            onChange={handleFilterChange(f.set)}
            options={f.options}
            className="w-52"
          />
        ))}
        {!loading && (
          <span className="ds-body-sm text-ds-ink-muted tabular-nums">{total} risultati</span>
        )}
      </div>

      {error && <DsAlert>{error}</DsAlert>}

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={cn(BO_TH, 'w-10 pr-0')}>
                <span className="sr-only">Dettaglio</span>
              </th>
              <th className={BO_TH}>Evento canonico</th>
              <th className={BO_TH}>Bookmaker</th>
              <th className={BO_TH}>Nomi bookmaker</th>
              <th className={BO_TH}>Competizione</th>
              <th className={BO_TH}>Sport</th>
              <th className={BO_TH}>Data evento</th>
              <th className={BO_TH}>Metodo</th>
              <th className={cn(BO_TH, 'text-right')}>Confidence</th>
              <th className={BO_TH}>Status</th>
              <th className={BO_TH}>Matched at</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className={BO_EMPTY_CELL}>
                  Caricamento dei matchings…
                </td>
              </tr>
            ) : matchings.length === 0 ? (
              <tr>
                <td colSpan={11} className={BO_EMPTY_CELL}>
                  Nessun matching trovato.
                </td>
              </tr>
            ) : (
              matchings.map((m) => (
                <MatchingRow
                  key={m.id}
                  matching={m}
                  isExpanded={expandedEventId === m.eventId}
                  loadingDetail={loadingDetail}
                  eventBookmakers={eventBookmakers}
                  onToggle={() => void toggleEvent(m.eventId)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <BoPagination
          label={`Pagina ${currentPage} di ${totalPages}`}
          prevDisabled={offset === 0}
          nextDisabled={offset + PAGE_SIZE >= total}
          onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          onNext={() => setOffset(offset + PAGE_SIZE)}
        />
      )}
    </>
  )
}

// --- Row component with expand ---

function MatchingRow({
  matching: m,
  isExpanded,
  loadingDetail,
  eventBookmakers,
  onToggle,
}: {
  matching: EventMatching
  isExpanded: boolean
  loadingDetail: boolean
  eventBookmakers: EventBookmaker[]
  onToggle: () => void
}) {
  const eventName = `${m.canonicalHome ?? '?'} - ${m.canonicalAway ?? '?'}`
  const Chevron = isExpanded ? ChevronDown : ChevronRight
  return (
    <>
      <tr
        className={cn(BO_ROW, 'cursor-pointer', isExpanded && 'bg-ds-surface-sunken/60')}
        onDoubleClick={onToggle}
      >
        <td className={cn(BO_TD, 'w-10 py-1.5 pr-0')}>
          <GIconButton
            label={`${isExpanded ? 'Chiudi' : 'Apri'} i bookmaker di ${eventName}`}
            onClick={onToggle}
          >
            <Chevron className="h-4 w-4" aria-hidden />
          </GIconButton>
        </td>
        <td className={cn(BO_TD, 'font-semibold whitespace-nowrap text-ds-ink')}>{eventName}</td>
        <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink')}>{m.bookmakerName}</td>
        <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted')}>
          {m.bookmakerHomeName ?? '?'} - {m.bookmakerAwayName ?? '?'}
        </td>
        <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted')}>{m.competitionName}</td>
        <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted')}>{m.sportName}</td>
        <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted tabular-nums')}>
          {formatDate(m.startTime)}
        </td>
        <td className={cn(BO_TD, 'whitespace-nowrap')}>
          <BoCode>{m.matchMethod}</BoCode>
        </td>
        <td
          className={cn(
            BO_TD,
            'text-right font-semibold whitespace-nowrap text-ds-ink tabular-nums',
          )}
        >
          {(m.matchConfidence * 100).toFixed(0)}%
        </td>
        <td className={cn(BO_TD, 'whitespace-nowrap')}>
          <StatusBadge status={m.matchStatus} />
        </td>
        <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted tabular-nums')}>
          {formatDate(m.matchedAt)}
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-t border-ds-line">
          <td colSpan={11} className="bg-ds-surface-sunken/40 px-4 py-4">
            <p className="ds-label m-0 mb-2 text-ds-ink-muted uppercase">
              Bookmaker associati a: {eventName}
            </p>
            {loadingDetail ? (
              <BoMuted>Caricamento…</BoMuted>
            ) : eventBookmakers.length === 0 ? (
              <BoMuted>Nessun bookmaker trovato.</BoMuted>
            ) : (
              <div className="overflow-x-auto rounded-ds-sm border border-ds-line bg-ds-surface-raised">
                <table className="w-full min-w-full border-collapse text-xs">
                  <thead>
                    <tr className={BO_THEAD_ROW}>
                      <th className="px-3 py-2 font-semibold">Bookmaker</th>
                      <th className="px-3 py-2 font-semibold">Nome home</th>
                      <th className="px-3 py-2 font-semibold">Nome away</th>
                      <th className="px-3 py-2 font-semibold">Competizione</th>
                      <th className="px-3 py-2 font-semibold">Metodo</th>
                      <th className="px-3 py-2 text-right font-semibold">Confidence</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Matched at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventBookmakers.map((bk) => (
                      <tr key={bk.id} className="border-t border-ds-line">
                        <td className="px-3 py-2 font-semibold whitespace-nowrap text-ds-ink">
                          {bk.bookmakerName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-ds-ink">
                          {bk.bookmakerHomeName ?? '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-ds-ink">
                          {bk.bookmakerAwayName ?? '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-ds-ink-muted">
                          {bk.bookmakerCompetitionName ?? '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <BoCode>{bk.matchMethod}</BoCode>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-ds-ink tabular-nums">
                          {(bk.matchConfidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <StatusBadge status={bk.matchStatus} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-ds-ink-muted tabular-nums">
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

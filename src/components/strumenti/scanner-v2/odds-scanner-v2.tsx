'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getMatcherMeta, getMatcherResults } from '@/services/api/matcher-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { exchangeCommissionOf, shortBookmakerName } from '@/lib/bookmakers'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildMultiplaBet } from '@/lib/calculators/bet-payloads'
import { matcherRowKey } from '@/lib/matcher/format'
import {
  matcherRowToMultiplaEvent,
  multiplaEligibility,
  multiplaSummary,
} from '@/lib/matcher/multipla'
import type { SharedAmounts } from '@/lib/matcher/quick-profit'
import type { MatcherFilters, MatcherMeta, MatcherResult } from '@/types/matcher'
import { multiplaEventKey, type MultiplaEvent } from '@/types/multipla-event'
import { AssignAccountsModal, type AssignLeg } from './assign-accounts-modal'
import { MatcherCalculatorModal } from './matcher-calculator-modal'
import {
  EMPTY_FILTERS,
  SHARED_AMOUNT_KEYS,
  ScannerV2FilterBar,
  type ScannerV2Filters,
} from './scanner-v2-filter-bar'
import {
  EMPTY_MULTIPLA_PARAMS,
  ScannerV2MultiplaPanel,
  type MultiplaParams,
} from './scanner-v2-multipla-panel'
import { ScannerV2Table, type MultiplaSelection } from './scanner-v2-table'

const PAGE_SIZE = 50
// One view: the store of every combination from the 80% floor up, all bookmakers
// against all, recomputed by the backend when prices change (§14.77, §14.86).
// Results follow ingestion by seconds on the backend, so the page polls every
// 20 s (first page, visible tab only).
const AUTO_REFRESH_MS = 20_000
const SEARCH_DEBOUNCE_MS = 350

/** A ticking clock so the ages on screen keep moving between polls. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
}

/**
 * The `allowed_bookmakers` parameter (§14.95): with a selection in either list,
 * every leg must sit on a selected book or exchange; the list left empty means
 * «all of that kind». Sorted, so the same selection gives the same query key.
 */
export function allowedBookmakersParam(
  selectedBooks: string[],
  selectedExchanges: string[],
  allBooks: string[],
  allExchanges: string[],
): string | undefined {
  if (selectedBooks.length === 0 && selectedExchanges.length === 0) return undefined
  const books = selectedBooks.length > 0 ? selectedBooks : allBooks
  const exchanges = selectedExchanges.length > 0 ? selectedExchanges : allExchanges
  return [...new Set([...books, ...exchanges])].sort().join(',')
}

/** A date-only input as the ISO bounds of that local day. */
function dayStartIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString()
}
function dayEndIso(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString()
}

interface SelectedMultiplaRow {
  key: string
  event: MultiplaEvent
}

export function OddsScannerV2() {
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [filters, setFiltersState] = useState<ScannerV2Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [results, setResults] = useState<MatcherResult[]>([])
  const [meta, setMeta] = useState<MatcherMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [calculatorRow, setCalculatorRow] = useState<MatcherResult | null>(null)
  const now = useNow(5_000)

  // ── Multipla ──
  const [multiplaOpen, setMultiplaOpen] = useState(false)
  const [multiplaParams, setMultiplaParams] = useState<MultiplaParams>(EMPTY_MULTIPLA_PARAMS)
  const [multiplaRows, setMultiplaRows] = useState<SelectedMultiplaRow[]>([])
  const [multiplaSaveOpen, setMultiplaSaveOpen] = useState(false)
  const [multiplaSaving, setMultiplaSaving] = useState(false)
  const [multiplaError, setMultiplaError] = useState<string | null>(null)
  const [multiplaSavedBetId, setMultiplaSavedBetId] = useState<string | null>(null)

  const setFilters = useCallback((patch: Partial<ScannerV2Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
    // The shared amounts do not touch the query: editing them keeps the page.
    if (
      (Object.keys(patch) as Array<keyof ScannerV2Filters>).some((k) => !SHARED_AMOUNT_KEYS.has(k))
    ) {
      setPage(0)
    }
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState((prev) => ({
      ...EMPTY_FILTERS,
      stake: prev.stake,
      bonus: prev.bonus,
      rimborso: prev.rimborso,
    }))
    setPage(0)
  }, [])

  const setMultiplaParam = useCallback((patch: Partial<MultiplaParams>) => {
    setMultiplaParams((prev) => ({ ...prev, ...patch }))
    setPage(0)
  }, [])

  // Filters and Multipla panels are alternatives, as in the old scanner.
  const openFilters = useCallback((open: boolean) => {
    setFiltersOpen(open)
    if (open) setMultiplaOpen(false)
  }, [])
  const openMultipla = useCallback((open: boolean) => {
    setMultiplaOpen(open)
    if (open) setFiltersOpen(false)
    setPage(0)
  }, [])

  // Debounce the search input so we don't hammer the API on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search)
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [filters.search])

  const books = useMemo(() => (meta?.bookmakers ?? []).filter((b) => b.isExchange !== true), [meta])
  const exchanges = useMemo(
    () => (meta?.bookmakers ?? []).filter((b) => b.isExchange === true),
    [meta],
  )
  const allowedParam = useMemo(
    () =>
      allowedBookmakersParam(
        filters.books,
        filters.exchanges,
        books.map((b) => b.slug),
        exchanges.map((b) => b.slug),
      ),
    [filters.books, filters.exchanges, books, exchanges],
  )

  // The multipla is played on one book: exactly one selected in the Book filter.
  const activeBook = filters.books.length === 1 ? filters.books[0] : null
  const activeBookName = activeBook
    ? shortBookmakerName(books.find((b) => b.slug === activeBook)?.name ?? activeBook)
    : null
  const multiplaMode = multiplaOpen && activeBook != null

  const query = useMemo<MatcherFilters>(() => {
    const q: MatcherFilters = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sort_by: 'rating',
      sort_dir: 'DESC',
    }
    if (filters.sport) q.sport = filters.sport
    if (filters.matchType) q.match_type = filters.matchType
    if (filters.marketType) q.market_type = filters.marketType
    if (filters.nation) q.nation = filters.nation
    if (filters.competitionIds.length > 0) q.competitions = filters.competitionIds.join(',')
    if (multiplaMode && activeBook) {
      // Every row involving the book: the punta side is checked in the browser,
      // the covers may sit on any bookmaker or exchange.
      q.bookmaker = activeBook
    } else if (allowedParam) {
      q.allowed_bookmakers = allowedParam
    }
    const minRating = parseNum(filters.minRating)
    const maxRating = parseNum(filters.maxRating)
    if (minRating != null) q.min_rating = minRating
    if (maxRating != null) q.max_rating = maxRating
    const minOdds = parseNum(
      multiplaMode && multiplaParams.quotaMinEvento
        ? multiplaParams.quotaMinEvento
        : filters.minOdds,
    )
    const maxOdds = parseNum(
      multiplaMode && multiplaParams.quotaMaxEvento
        ? multiplaParams.quotaMaxEvento
        : filters.maxOdds,
    )
    if (minOdds != null) q.min_odds = minOdds
    if (maxOdds != null) q.max_odds = maxOdds
    if (debouncedSearch) q.search = debouncedSearch
    if (multiplaMode && multiplaParams.dataInizio)
      q.start_time_from = dayStartIso(multiplaParams.dataInizio)
    else if (filters.startFrom) q.start_time_from = new Date(filters.startFrom).toISOString()
    if (multiplaMode && multiplaParams.dataFine)
      q.start_time_to = dayEndIso(multiplaParams.dataFine)
    else if (filters.startTo) q.start_time_to = new Date(filters.startTo).toISOString()
    return q
  }, [
    page,
    filters.sport,
    filters.matchType,
    filters.marketType,
    filters.nation,
    filters.competitionIds,
    filters.minRating,
    filters.maxRating,
    filters.minOdds,
    filters.maxOdds,
    filters.startFrom,
    filters.startTo,
    allowedParam,
    debouncedSearch,
    multiplaMode,
    activeBook,
    multiplaParams.quotaMinEvento,
    multiplaParams.quotaMaxEvento,
    multiplaParams.dataInizio,
    multiplaParams.dataFine,
  ])

  const loadMeta = useCallback(async () => {
    try {
      const m = await getMatcherMeta()
      setMeta(m)
      // A selected competition that left the results (its rows purged) leaves the
      // filter too: the dropdown could not show it any more.
      if (m.competitions) {
        const known = new Set(m.competitions.map((c) => c.id))
        setFiltersState((prev) =>
          prev.competitionIds.every((id) => known.has(id))
            ? prev
            : { ...prev, competitionIds: prev.competitionIds.filter((id) => known.has(id)) },
        )
      }
    } catch {
      /* ignore: meta is non-critical */
    }
  }, [])

  const loadResults = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMatcherResults(query)
      setResults(res.results)
      setTotal(res.total)
    } catch {
      /* ignore: the next poll retries */
    }
    setLoading(false)
  }, [query])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
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
  const commissionPercent = exchangeCommissionOf(meta) * 100
  const shared = useMemo<SharedAmounts>(
    () => ({
      puntata: parseNum(filters.stake),
      bonus: parseNum(filters.bonus) ?? 0,
      rimborso: parseNum(filters.rimborso) ?? 0,
    }),
    [filters.stake, filters.bonus, filters.rimborso],
  )

  // ── Multipla selection ──
  const multiplaEvents = useMemo(() => multiplaRows.map((r) => r.event), [multiplaRows])
  const multiplaKeys = useMemo(() => new Set(multiplaRows.map((r) => r.key)), [multiplaRows])
  const multiplaSelection = useMemo<MultiplaSelection | undefined>(() => {
    if (!multiplaOpen) return undefined
    return {
      isSelected: (row) => multiplaKeys.has(matcherRowKey(row)),
      eligibility: (row) =>
        multiplaEligibility(
          row,
          activeBook,
          multiplaEvents,
          multiplaParams.numEventi,
          meta,
          multiplaKeys,
          matcherRowKey(row),
        ),
      onToggle: (row) => {
        const key = matcherRowKey(row)
        setMultiplaRows((prev) => {
          if (prev.some((r) => r.key === key)) return prev.filter((r) => r.key !== key)
          if (!activeBook) return prev
          const event = matcherRowToMultiplaEvent(row, activeBook, meta, commissionPercent)
          if (!event) return prev
          return [...prev, { key, event }]
        })
      },
    }
  }, [
    multiplaOpen,
    multiplaKeys,
    multiplaEvents,
    activeBook,
    multiplaParams.numEventi,
    meta,
    commissionPercent,
  ])

  const removeMultiplaEvent = useCallback((event: MultiplaEvent) => {
    const eventKey = multiplaEventKey(event)
    setMultiplaRows((prev) => prev.filter((r) => multiplaEventKey(r.event) !== eventKey))
  }, [])
  const clearMultipla = useCallback(() => setMultiplaRows([]), [])

  // One account for the book, one per cover bookmaker (a lay on Betfair and a
  // back on Bwin cannot share a login).
  const multiplaAssignLegs = useMemo<AssignLeg[]>(() => {
    if (!activeBook) return []
    const summary = multiplaSummary(multiplaEvents, shared.puntata, shared.bonus, shared.rimborso)
    const legs: AssignLeg[] = [
      {
        key: 'punta',
        title: 'Collaboratore Punta (multipla)',
        detail: `${multiplaEvents.length} eventi @ ${summary.quotaTotale != null ? summary.quotaTotale.toFixed(2) : '—'} · ${((shared.puntata ?? 0) + shared.bonus).toFixed(2)} €`,
        bookmaker: { slug: activeBook, name: activeBookName ?? activeBook, isExchange: false },
        tone: 'primary',
      },
    ]
    const covers = new Map<string, MultiplaEvent[]>()
    for (const ev of multiplaEvents) {
      covers.set(ev.bookId2, [...(covers.get(ev.bookId2) ?? []), ev])
    }
    for (const [slug, events] of covers) {
      const first = events[0]
      legs.push({
        key: `cover:${slug}`,
        title: `Collaboratore copertura (${events.length})`,
        detail: events.map((e) => `${e.home} – ${e.away}`).join(', '),
        bookmaker: {
          slug,
          name: first.bookName2 ?? slug,
          isExchange: first.coverIsExchange ?? first.type === 'punta-banca',
        },
        tone: events.some((e) => e.type === 'punta-banca') ? 'destructive' : 'sky',
      })
    }
    return legs
  }, [activeBook, activeBookName, multiplaEvents, shared])

  const handleMultiplaConfirm = async (accountIds: Record<string, string>) => {
    if (!activeBook || multiplaEvents.length < 2) return
    const stake = shared.puntata ?? 0
    if (stake <= 0 && shared.bonus <= 0) {
      setMultiplaError('Inserisci almeno la puntata o il bonus nella barra.')
      return
    }
    setMultiplaSaving(true)
    setMultiplaError(null)
    try {
      const coverAccountIds: Record<string, string> = {}
      for (const [key, id] of Object.entries(accountIds)) {
        if (key.startsWith('cover:')) coverAccountIds[key.slice('cover:'.length)] = id
      }
      const { betPayload, legsPayload } = buildMultiplaBet({
        events: multiplaEvents,
        accountIdPunta: accountIds.punta,
        coverAccountIds,
        stake,
        bonus: shared.bonus,
        rimborso: shared.rimborso,
        categoria: 'matched_betting',
      })
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setMultiplaSavedBetId(bet.id)
    } catch (err) {
      setMultiplaError(err instanceof Error ? err.message : 'Errore nel salvataggio della multipla')
    } finally {
      setMultiplaSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <ScannerV2FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        open={filtersOpen}
        onOpenChange={openFilters}
        meta={meta}
        books={books}
        exchanges={exchanges}
        loading={loading}
        multiplaOpen={multiplaOpen}
        onMultiplaOpenChange={openMultipla}
        multiplaSelected={multiplaRows.length}
        multiplaTarget={multiplaParams.numEventi}
      />
      {multiplaOpen && (
        <ScannerV2MultiplaPanel
          params={multiplaParams}
          onParamsChange={setMultiplaParam}
          selected={multiplaEvents}
          onRemove={removeMultiplaEvent}
          onClear={clearMultipla}
          onSave={() => {
            setMultiplaError(null)
            setMultiplaSavedBetId(null)
            setMultiplaSaveOpen(true)
          }}
          shared={shared}
          bookName={activeBookName}
        />
      )}
      <ScannerV2Table
        results={results}
        meta={meta}
        now={now}
        shared={shared}
        commissionPercent={commissionPercent}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onOpenCalculator={setCalculatorRow}
        multipla={multiplaSelection}
      />
      <MatcherCalculatorModal
        row={calculatorRow}
        meta={meta}
        defaults={{ stake: filters.stake, bonus: filters.bonus, rimborso: filters.rimborso }}
        commissionPercent={commissionPercent}
        onClose={() => setCalculatorRow(null)}
      />
      <AssignAccountsModal
        open={multiplaSaveOpen}
        onOpenChange={(open) => {
          setMultiplaSaveOpen(open)
          if (!open) setMultiplaError(null)
        }}
        legs={multiplaAssignLegs}
        onConfirm={(ids) => void handleMultiplaConfirm(ids)}
        saving={multiplaSaving}
        error={multiplaError}
        savedBetId={multiplaSavedBetId}
        onDone={() => {
          setMultiplaSaveOpen(false)
          setMultiplaSavedBetId(null)
          setMultiplaRows([])
        }}
      />
    </div>
  )
}

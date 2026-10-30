'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMatcherMeta, getMatcherResults } from '@/services/api/matcher-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { holdCalcBridge } from '@/components/calculators/calculator-panel'
import { exchangeCommissionOf, shortBookmakerName } from '@/lib/bookmakers'
import { bookmakersParam, coverBookmakersParam } from '@/lib/matcher/bookmaker-params'
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
import { MatcherCalculatorPanel } from './matcher-calculator-panel'
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
// No polling: the page loads on mount and on every filter change, and the user
// reloads on demand with «Aggiorna».
const SEARCH_DEBOUNCE_MS = 350
/** The green flash of the table after «Aggiorna» (motion-flash of the design). */
const FLASH_MS = 600

/** A ticking clock so the ages on screen keep moving between reloads. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
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
  // I risultati in mano sono «per» una query: finché non è quella corrente si sta caricando;
  // «Aggiorna» alza refreshing (react-hooks/set-state-in-effect).
  const [loadedQuery, setLoadedQuery] = useState<MatcherFilters | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [calculatorRow, setCalculatorRow] = useState<MatcherResult | null>(null)
  const [flash, setFlash] = useState(false)
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
      sort: prev.sort,
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
  // «Book» = the book the stake goes on (at least one leg on it); «Book di
  // copertura» and «Exchange» = where the other legs may sit (§14.102).
  const bookmakerParam = useMemo(() => bookmakersParam(filters.books), [filters.books])
  const coverParam = useMemo(
    () =>
      coverBookmakersParam(
        filters.coverBooks,
        filters.exchanges,
        books.map((b) => b.slug),
        exchanges.map((b) => b.slug),
      ),
    [filters.coverBooks, filters.exchanges, books, exchanges],
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
      // «Ordina per»: the best rating first, or the nearest kickoff first.
      sort_by: filters.sort,
      sort_dir: filters.sort === 'start_time' ? 'ASC' : 'DESC',
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
    } else {
      if (bookmakerParam) q.bookmaker = bookmakerParam
      if (coverParam) q.cover_bookmakers = coverParam
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
    filters.sort,
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
    bookmakerParam,
    coverParam,
    debouncedSearch,
    multiplaMode,
    activeBook,
    multiplaParams.quotaMinEvento,
    multiplaParams.quotaMaxEvento,
    multiplaParams.dataInizio,
    multiplaParams.dataFine,
  ])

  const loading = refreshing || loadedQuery !== query

  // State changes only in promise callbacks, so the effects can call these as they are
  // (react-hooks/set-state-in-effect).
  const loadMeta = useCallback(
    () =>
      getMatcherMeta()
        .then((m) => {
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
        })
        .catch(() => {
          /* ignore: meta is non-critical */
        }),
    [],
  )

  const applyResults = useCallback((res: Awaited<ReturnType<typeof getMatcherResults>>) => {
    setResults(res.results)
    setTotal(res.total)
  }, [])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  // A response that lands after the query changed is ignored.
  useEffect(() => {
    let cancelled = false
    getMatcherResults(query)
      .then((res) => {
        if (!cancelled) applyResults(res)
      })
      .catch(() => {
        /* ignore: the user can retry with «Aggiorna» */
      })
      .finally(() => {
        if (!cancelled) setLoadedQuery(query)
      })
    return () => {
      cancelled = true
    }
  }, [query, applyResults])

  // «Aggiorna»: same query, filters as they are right now; the table flashes when it worked.
  const refresh = useCallback(() => {
    void loadMeta()
    setRefreshing(true)
    getMatcherResults(query)
      .then((res) => {
        applyResults(res)
        setFlash(true)
        setTimeout(() => setFlash(false), FLASH_MS)
      })
      .catch(() => {
        /* ignore: the user can retry with «Aggiorna» */
      })
      .finally(() => setRefreshing(false))
  }, [query, applyResults, loadMeta])

  // The page is light (ds-*): the accounts dialog of the multipla takes the same palette through
  // the bridge of the calculators while it is open (the calculator panel holds its own).
  useEffect(() => (multiplaSaveOpen ? holdCalcBridge() : undefined), [multiplaSaveOpen])

  // The calculator opens full screen; on close the focus goes back where it was (the row button).
  const focusBeforeCalculator = useRef<HTMLElement | null>(null)
  const openCalculator = useCallback((row: MatcherResult) => {
    focusBeforeCalculator.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setCalculatorRow(row)
  }, [])
  const closeCalculator = useCallback(() => {
    setCalculatorRow(null)
    const el = focusBeforeCalculator.current
    focusBeforeCalculator.current = null
    if (el?.isConnected) requestAnimationFrame(() => el.focus())
  }, [])
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
      setMultiplaError('Inserisci la puntata nella barra o la puntata bonus nella multipla.')
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
    <>
      {/* Under the open calculator the page leaves the tab order and the screen readers. */}
      <div inert={calculatorRow ? true : undefined} className="flex flex-col gap-4">
        <ScannerV2FilterBar
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onRefresh={refresh}
          open={filtersOpen}
          onOpenChange={openFilters}
          meta={meta}
          books={books}
          exchanges={exchanges}
          loading={loading}
          now={now}
          multiplaOpen={multiplaOpen}
          onMultiplaOpenChange={openMultipla}
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
            bonus={filters.bonus}
            rimborso={filters.rimborso}
            onAmountsChange={setFilters}
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
          flash={flash}
          activeKey={calculatorRow ? matcherRowKey(calculatorRow) : null}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onOpenCalculator={openCalculator}
          onResetFilters={resetFilters}
          multipla={multiplaSelection}
        />
      </div>
      {calculatorRow && (
        <MatcherCalculatorPanel
          row={calculatorRow}
          meta={meta}
          defaults={{ stake: filters.stake, bonus: filters.bonus, rimborso: filters.rimborso }}
          commissionPercent={commissionPercent}
          onClose={closeCalculator}
        />
      )}
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
    </>
  )
}

'use client'

import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react'
import { useOddsmatcher } from '@/hooks/use-oddsmatcher'
import type { OddsmatcherRow } from '@/types/oddsmatcher'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS_ONLY, ODDSMATCHER_EXCHANGES_ONLY } from '@/lib/oddsmatcher-books'
import {
  Calculator,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { OddsmatcherCalculatorModal } from '@/components/strumenti/oddsmatcher-calculator-modal'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { cn } from '@/lib/utils'
import type { SharedFilters } from '@/types/shared-filters'
import type { MultiplaEvent } from '@/types/multipla-event'
import { multiplaEventKey } from '@/types/multipla-event'

const PAGE_SIZE = 25
const EXCHANGE_COMMISSION = 0.03

/** 0 = Calcio, 1 = Tennis, 2 = Basket */
const SPORT_LABELS: Record<string, { label: string; icon: string }> = {
  '0': { label: 'Calcio', icon: '⚽' },
  '1': { label: 'Tennis', icon: '🎾' },
  '2': { label: 'Basket', icon: '🏀' },
}

function getSportDisplay(sportId: string) {
  return SPORT_LABELS[sportId] ?? { label: `Sport ${sportId}`, icon: '' }
}

function formatDate(date: string, hour: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y} h. ${hour}`
}

function formatLiquidity(liquidity: string): string {
  const num = parseFloat(liquidity)
  if (Number.isNaN(num)) return liquidity
  return `€${num % 1 === 0 ? num : num.toFixed(2)}`
}

function ratingValue(backOdd: string, layOdd: string): number {
  const back = parseFloat(backOdd)
  const lay = parseFloat(layOdd)
  if (Number.isNaN(back) || Number.isNaN(lay) || back <= 0 || lay <= 0) return 0
  const layEffective = lay - EXCHANGE_COMMISSION
  if (layEffective <= 0) return 0
  return ((back * (1 - EXCHANGE_COMMISSION)) / layEffective) * 100
}

function computeRating(backOdd: string, layOdd: string): string {
  const value = ratingValue(backOdd, layOdd)
  if (value === 0) return '—'
  return `${value.toFixed(2)}%`
}

function rowToKey(row: OddsmatcherRow): string {
  return `${row.date}|${row.hour}|${row.home}|${row.away}|${row.market}|${row.selection}|${row.id_book_1}|${row.id_book_2}`
}

function isRowAfter(row: OddsmatcherRow, refDate: string, refHour: string): boolean {
  if (row.date > refDate) return true
  if (row.date < refDate) return false
  return row.hour > refHour
}

function ratingMultipla(selected: MultiplaEvent[]): number | null {
  if (selected.length === 0) return null
  let product = 1
  for (const ev of selected) {
    const main = parseFloat(ev.mainOdd)
    const cover = parseFloat(ev.coverOdd)
    const c = ev.commissionPercent / 100
    if (Number.isNaN(main) || Number.isNaN(cover) || cover <= 0) return null
    if (ev.type === 'punta-punta') {
      if (cover <= 1) return null
      product *= (main * (cover - 1)) / cover
    } else {
      const coverEffective = cover - c
      if (coverEffective <= 0) return null
      product *= (main * (1 - c)) / coverEffective
    }
  }
  return product * 100
}

function formatDateShort(date: string, hour: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m} ${hour}`
}

export function OddsmatcherTable({
  filters,
  onMetadata,
}: {
  filters: SharedFilters
  onMetadata?: (sports: string[], markets: string[]) => void
}) {
  const {
    searchQuery,
    setSearchQuery,
    sharedStake,
    sharedBonus,
    sharedRimborso,
    setSharedStake,
    setSharedBonus,
    setSharedRimborso,
    selectedSportIds,
    setSelectedSportIds,
    selectedMarkets,
    setSelectedMarkets,
    minOdds,
    setMinOdds,
    maxOdds,
    setMaxOdds,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    minLiquidity,
    setMinLiquidity,
    minRating,
    setMinRating,
    filtersOpen,
    setFiltersOpen,
    multiplaOpen,
    setMultiplaOpen,
    multiplaNumEventi,
    setMultiplaNumEventi,
    multiplaQuotaMinEvento,
    setMultiplaQuotaMinEvento,
    multiplaQuotaMaxEvento,
    setMultiplaQuotaMaxEvento,
    multiplaQuotaMinTotale,
    setMultiplaQuotaMinTotale,
    multiplaDataInizio,
    setMultiplaDataInizio,
    multiplaDataFine,
    setMultiplaDataFine,
    multiplaSelectedEvents,
    setMultiplaSelectedEvents,
    multiplaSportIds,
    setMultiplaSportIds,
    toggleMultiplaEvent,
    eliminaMultipla,
    resetMultiplaFilters,
  } = filters

  // ── Tab-specific state ──
  const [page, setPage] = useState(1)
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>(() =>
    ODDSMATCHER_EXCHANGES_ONLY.map((e) => e.id),
  )
  const [calculatorRow, setCalculatorRow] = useState<OddsmatcherRow | null>(null)
  const startDateInputRef = useRef<HTMLInputElement>(null)
  const endDateInputRef = useRef<HTMLInputElement>(null)
  const multiplaDataInizioRef = useRef<HTMLInputElement>(null)
  const multiplaDataFineRef = useRef<HTMLInputElement>(null)
  const buildApiParams = () => ({
    id_book: selectedBookIds.length > 0 ? selectedBookIds : undefined,
    id_exchange: selectedExchangeIds.length > 0 ? selectedExchangeIds : undefined,
  })
  const [committedParams, setCommittedParams] = useState(buildApiParams)
  const { data, isLoading, isError, error, refetch, isRefetching } = useOddsmatcher(committedParams)

  // Deferred values: l'input resta reattivo, il filtering pesante viene differito
  const deferredMinOdds = useDeferredValue(minOdds)
  const deferredMaxOdds = useDeferredValue(maxOdds)
  const deferredMinLiquidity = useDeferredValue(minLiquidity)
  const deferredMinRating = useDeferredValue(minRating)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [
    data,
    deferredSearchQuery,
    selectedBookIds,
    selectedExchangeIds,
    selectedSportIds,
    selectedMarkets,
    deferredMinLiquidity,
    deferredMinRating,
    deferredMinOdds,
    deferredMaxOdds,
    startDate,
    endDate,
  ])

  useEffect(() => {
    if (selectedBookIds.length === 1) queueMicrotask(() => setPage(1))
  }, [multiplaSelectedEvents, selectedBookIds.length])

  const resetFilters = () => {
    filters.resetFilters()
    setSelectedBookIds([])
    setSelectedExchangeIds(ODDSMATCHER_EXCHANGES_ONLY.map((e) => e.id))
    setCommittedParams({ id_book: undefined, id_exchange: undefined })
    queueMicrotask(() => refetch())
  }

  const rows = useMemo(() => data ?? [], [data])
  const sports = useMemo(() => [...new Set(rows.map((r) => r.sport))].sort(), [rows])
  const markets = useMemo(() => [...new Set(rows.map((r) => r.market))].sort(), [rows])

  useEffect(() => {
    onMetadata?.(sports, markets)
  }, [sports, markets, onMetadata])

  const selectedKeysSet = useMemo(
    () => new Set(multiplaSelectedEvents.map(multiplaEventKey)),
    [multiplaSelectedEvents],
  )
  const multiplaRating = ratingMultipla(multiplaSelectedEvents)
  const quotaMultipla =
    multiplaSelectedEvents.length > 0
      ? multiplaSelectedEvents.reduce((acc, ev) => {
          const main = parseFloat(ev.mainOdd)
          return Number.isNaN(main) ? acc : acc * main
        }, 1)
      : null
  const guadagnoMultipla = useMemo(() => {
    if (quotaMultipla == null || multiplaSelectedEvents.length === 0) return null
    const stake = Number.parseFloat(sharedStake) || 0
    const bonus = Number.parseFloat(sharedBonus) || 0
    const rimborso = Number.parseFloat(sharedRimborso) || 0
    const backStakeTotale = stake + bonus
    if (backStakeTotale <= 0) return null
    const results = multiplaLayStakes(
      backStakeTotale,
      quotaMultipla,
      multiplaSelectedEvents.map((ev) => ({
        type: ev.type,
        coverOdds: parseFloat(ev.coverOdd),
        commissionPercent: ev.commissionPercent,
      })),
      rimborso,
    )
    const totalHedgeCost = results.reduce((sum, r) => sum + r.hedgeCost, 0)
    return backStakeTotale * quotaMultipla - stake - totalHedgeCost
  }, [quotaMultipla, multiplaSelectedEvents, sharedStake, sharedBonus, sharedRimborso])

  const toggleBook = (id: string) => {
    setSelectedBookIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleExchange = (id: string) => {
    setSelectedExchangeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }
  const toggleSport = (id: string) => {
    setSelectedSportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }
  const toggleMarket = (value: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
    )
  }

  const bookButtonLabel =
    selectedBookIds.length === 0
      ? 'Book'
      : selectedBookIds.length === 1
        ? (ODDSMATCHER_BOOKS_ONLY.find((b) => b.id === selectedBookIds[0])?.name ?? 'Book')
        : `${selectedBookIds.length} book`

  const exchangeButtonLabel =
    selectedExchangeIds.length === 0
      ? 'Exchange'
      : selectedExchangeIds.length === 1
        ? (ODDSMATCHER_EXCHANGES_ONLY.find((e) => e.id === selectedExchangeIds[0])?.name ??
          'Exchange')
        : `${selectedExchangeIds.length} exchange`

  const activeFilterCount = [
    selectedSportIds.length > 0,
    selectedMarkets.length > 0,
    minOdds.trim() !== '',
    maxOdds.trim() !== '',
    startDate.trim() !== '',
    endDate.trim() !== '',
    minLiquidity.trim() !== '',
    minRating.trim() !== '',
  ].filter(Boolean).length

  const filtersBarSlim = (
    <div className="space-y-0">
      {/* Tab-specific bar */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5">
        <SearchableMultiSelect
          options={ODDSMATCHER_BOOKS_ONLY}
          selectedIds={selectedBookIds}
          onToggle={toggleBook}
          buttonLabel={bookButtonLabel}
          searchPlaceholder="Cerca book..."
          searchInputAriaLabel="Filtra book"
          emptyMessage="Nessun book trovato"
          size="sm"
          renderOption={(opt) => (
            <Image
              src={`/loghi_book/${opt.id}.png`}
              alt={opt.name}
              width={80}
              height={24}
              className="h-5 w-auto max-w-[80px] object-contain"
            />
          )}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-[120px] justify-between text-xs"
            >
              {exchangeButtonLabel}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[280px] overflow-y-auto">
            {ODDSMATCHER_EXCHANGES_ONLY.map((ex) => (
              <DropdownMenuItem
                key={ex.id}
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
              >
                <label className="flex w-full cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={selectedExchangeIds.includes(ex.id)}
                    onChange={() => toggleExchange(ex.id)}
                  />
                  <Image
                    src={`/loghi_book/${ex.id}.png`}
                    alt={ex.name}
                    width={80}
                    height={24}
                    className="h-5 w-auto max-w-[80px] object-contain"
                  />
                </label>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => {
              setCommittedParams(buildApiParams())
              queueMicrotask(() => refetch())
            }}
            disabled={isRefetching}
            size="sm"
            className="h-8 text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
            Refresh
          </Button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Reset filtri"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  )

  const loadingBlock = (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-card p-12"
      role="status"
      aria-label="Caricamento quote in corso"
    >
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">Caricamento quote...</p>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {filtersBarSlim}
        {loadingBlock}
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
          defaultPuntata={sharedStake}
          defaultBonus={sharedBonus}
          defaultRimborso={sharedRimborso}
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {filtersBarSlim}
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Errore nel caricamento dei dati.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message ?? 'Riprova piÃ¹ tardi.'}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Riprova
          </Button>
        </div>
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
          defaultPuntata={sharedStake}
          defaultBonus={sharedBonus}
          defaultRimborso={sharedRimborso}
        />
      </div>
    )
  }

  if (rows.length === 0 && !isRefetching) {
    return (
      <div className="space-y-4">
        {filtersBarSlim}
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          Nessun dato disponibile.
        </div>
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
          defaultPuntata={sharedStake}
          defaultBonus={sharedBonus}
          defaultRimborso={sharedRimborso}
        />
      </div>
    )
  }

  const q = deferredSearchQuery.trim().toLowerCase()
  let filteredRows = q
    ? rows.filter((row) => {
        const eventText = `${row.home} ${row.away}`.toLowerCase()
        const tournament = row.competition.toLowerCase()
        return eventText.includes(q) || tournament.includes(q)
      })
    : rows

  if (selectedSportIds.length > 0) {
    const sportSet = new Set(selectedSportIds)
    filteredRows = filteredRows.filter((row) => sportSet.has(row.sport))
  }
  if (selectedMarkets.length > 0) {
    const marketSet = new Set(selectedMarkets)
    filteredRows = filteredRows.filter((row) => marketSet.has(row.market))
  }
  if (deferredMinLiquidity.trim() !== '') {
    const minLiq = parseFloat(deferredMinLiquidity)
    if (!Number.isNaN(minLiq)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.liquidity) >= minLiq)
    }
  }
  if (deferredMinRating.trim() !== '') {
    const minR = parseFloat(deferredMinRating)
    if (!Number.isNaN(minR)) {
      filteredRows = filteredRows.filter((row) => ratingValue(row.back_odd, row.lay_odd) >= minR)
    }
  }
  if (deferredMinOdds.trim() !== '') {
    const minO = parseFloat(deferredMinOdds)
    if (!Number.isNaN(minO)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.back_odd) >= minO)
    }
  }
  if (deferredMaxOdds.trim() !== '') {
    const maxO = parseFloat(deferredMaxOdds)
    if (!Number.isNaN(maxO)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.back_odd) <= maxO)
    }
  }
  if (startDate.trim() !== '') {
    filteredRows = filteredRows.filter((row) => row.date >= startDate)
  }
  if (endDate.trim() !== '') {
    filteredRows = filteredRows.filter((row) => row.date <= endDate)
  }
  const exchangeSet = new Set(selectedExchangeIds)
  filteredRows = filteredRows.filter(
    (row) => exchangeSet.has(row.id_book_1) || exchangeSet.has(row.id_book_2),
  )

  // Multipla filters (when multipla panel is open)
  const multiplaBookId = filters.multiplaBookId
  if (multiplaOpen) {
    if (multiplaBookId) {
      filteredRows = filteredRows.filter((row) => row.id_book_1 === multiplaBookId)
    }
    if (multiplaQuotaMinEvento.trim() !== '') {
      const minQ = parseFloat(multiplaQuotaMinEvento)
      if (!Number.isNaN(minQ))
        filteredRows = filteredRows.filter((row) => parseFloat(row.back_odd) >= minQ)
    }
    if (multiplaQuotaMaxEvento.trim() !== '') {
      const maxQ = parseFloat(multiplaQuotaMaxEvento)
      if (!Number.isNaN(maxQ))
        filteredRows = filteredRows.filter((row) => parseFloat(row.back_odd) <= maxQ)
    }
    if (multiplaSportIds.length > 0) {
      const sportSet = new Set(multiplaSportIds)
      filteredRows = filteredRows.filter((row) => sportSet.has(row.sport))
    }
    if (multiplaDataInizio.trim() !== '') {
      filteredRows = filteredRows.filter((row) => row.date >= multiplaDataInizio)
    }
    if (multiplaDataFine.trim() !== '') {
      filteredRows = filteredRows.filter((row) => row.date <= multiplaDataFine)
    }
  }

  const sortedRows = [...filteredRows].sort(
    (a, b) => ratingValue(b.back_odd, b.lay_odd) - ratingValue(a.back_odd, a.lay_odd),
  )

  /* Old mainCard/advancedFiltersSection/multiplaSection/eventiSelezionatiPanel removed —
     everything is now inside filtersBarSlim with collapsible panels */

  if (isRefetching) {
    return (
      <div className="space-y-4">
        {filtersBarSlim}
        {loadingBlock}
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
          defaultPuntata={sharedStake}
          defaultBonus={sharedBonus}
          defaultRimborso={sharedRimborso}
        />
      </div>
    )
  }

  if (filteredRows.length === 0) {
    return (
      <div className="space-y-4">
        {filtersBarSlim}
        {selectedBookIds.length !== 1 && (
          <div className="rounded-md border border-border bg-muted/30 p-6 text-center text-muted-foreground">
            Seleziona un solo book dalla tendina per compilare la multipla.
          </div>
        )}
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          Nessun risultato
          {searchQuery.trim() && ` per "${searchQuery.trim()}"`}. Prova a modificare ricerca o
          filtri.
        </div>
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
          defaultPuntata={sharedStake}
          defaultBonus={sharedBonus}
          defaultRimborso={sharedRimborso}
        />
      </div>
    )
  }

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE)
  const paginatedRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, sortedRows.length)

  const oneBookId = multiplaOpen
    ? multiplaBookId
    : selectedBookIds.length === 1
      ? selectedBookIds[0]
      : null
  let multiplaAvailableRows: OddsmatcherRow[] = []
  if (oneBookId) {
    // Partire dai dati già filtrati (sortedRows) così i filtri avanzati restano applicati
    multiplaAvailableRows = sortedRows.filter((r) => r.id_book_1 === oneBookId)
    if (multiplaSelectedEvents.length > 0) {
      const last = multiplaSelectedEvents[multiplaSelectedEvents.length - 1]
      multiplaAvailableRows = multiplaAvailableRows.filter((row) =>
        isRowAfter(row, last.date, last.hour),
      )
    } else if (multiplaDataInizio.trim() !== '') {
      multiplaAvailableRows = multiplaAvailableRows.filter((row) => row.date >= multiplaDataInizio)
    }
    if (multiplaDataFine.trim() !== '') {
      multiplaAvailableRows = multiplaAvailableRows.filter((row) => row.date <= multiplaDataFine)
    }
    if (multiplaQuotaMinEvento.trim() !== '') {
      const minQ = parseFloat(multiplaQuotaMinEvento)
      if (!Number.isNaN(minQ)) {
        multiplaAvailableRows = multiplaAvailableRows.filter(
          (row) => parseFloat(row.back_odd) >= minQ,
        )
      }
    }
    if (multiplaQuotaMaxEvento.trim() !== '') {
      const maxQ = parseFloat(multiplaQuotaMaxEvento)
      if (!Number.isNaN(maxQ)) {
        multiplaAvailableRows = multiplaAvailableRows.filter(
          (row) => parseFloat(row.back_odd) <= maxQ,
        )
      }
    }
    if (multiplaSportIds.length > 0) {
      const sportSet = new Set(multiplaSportIds)
      multiplaAvailableRows = multiplaAvailableRows.filter((row) => sportSet.has(row.sport))
    }
    const selectedKeys = new Set(multiplaSelectedEvents.map(multiplaEventKey))
    multiplaAvailableRows = multiplaAvailableRows.filter((row) => !selectedKeys.has(rowToKey(row)))
    multiplaAvailableRows = [...multiplaAvailableRows].sort(
      (a, b) => ratingValue(b.back_odd, b.lay_odd) - ratingValue(a.back_odd, a.lay_odd),
    )
  }
  const multiplaTotalPages = Math.ceil(multiplaAvailableRows.length / PAGE_SIZE)
  const multiplaPaginatedRows = multiplaAvailableRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  )
  const multiplaStart = multiplaAvailableRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const multiplaEnd = Math.min(page * PAGE_SIZE, multiplaAvailableRows.length)

  const oddsRowToMultiplaEvent = (row: OddsmatcherRow): MultiplaEvent => ({
    type: 'punta-banca',
    sport: row.sport,
    home: row.home,
    away: row.away,
    date: row.date,
    hour: row.hour,
    competition: row.competition,
    market: row.market,
    selection: row.selection,
    mainOdd: row.back_odd,
    coverOdd: row.lay_odd,
    bookId1: row.id_book_1,
    bookId2: row.id_book_2,
    commissionPercent: EXCHANGE_COMMISSION * 100,
  })

  const handleToggleMultipla = (row: OddsmatcherRow) => {
    toggleMultiplaEvent(oddsRowToMultiplaEvent(row))
  }

  const tableRows = oneBookId ? multiplaPaginatedRows : paginatedRows
  const tableTotal = oneBookId ? multiplaAvailableRows.length : sortedRows.length
  const tablePages = oneBookId ? multiplaTotalPages : totalPages
  const tableStart = oneBookId ? multiplaStart : start
  const tableEnd = oneBookId ? multiplaEnd : end

  return (
    <div className="space-y-4">
      {filtersBarSlim}
      {!multiplaOpen && oneBookId === null && (
        <div className="rounded-md border border-border bg-muted/30 p-6 text-center text-muted-foreground">
          Seleziona un solo book dalla tendina per compilare la multipla.
        </div>
      )}
      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {tableRows.map((row: OddsmatcherRow, index: number) => {
          const key = oneBookId
            ? rowToKey(row)
            : `${row.home}-${row.away}-${row.selection}-${row.market}-${(page - 1) * PAGE_SIZE + index}`
          const isSelected = selectedKeysSet.has(rowToKey(row))
          const checkboxDisabled =
            oneBookId === null ||
            (!isSelected && multiplaSelectedEvents.length >= multiplaNumEventi)
          const { icon: sportIcon } = getSportDisplay(row.sport)
          return (
            <div
              key={key}
              className={cn(
                'rounded-xl border p-3 transition-colors',
                isSelected ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
              )}
              onClick={() => setCalculatorRow(row)}
            >
              {/* Row 1: sport + event + rating */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {sportIcon && <span className="text-sm">{sportIcon}</span>}
                    <span className="truncate text-sm font-medium">
                      {row.home} – {row.away}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.competition} · {row.market} · {row.selection}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                  {computeRating(row.back_odd, row.lay_odd)}
                </span>
              </div>
              {/* Row 2: quotes + liquidity */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Image
                    src={`/loghi_book/${row.id_book_1}.png`}
                    alt=""
                    width={60}
                    height={20}
                    className="h-5 w-auto max-w-[60px] object-contain"
                    loading="lazy"
                  />
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                    {row.back_odd}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">vs</span>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive">
                    {row.lay_odd}
                  </span>
                  <Image
                    src={`/loghi_book/${row.id_book_2}.png`}
                    alt=""
                    width={60}
                    height={20}
                    className="h-5 w-auto max-w-[60px] object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatLiquidity(row.liquidity)}
                </span>
              </div>
              {/* Row 3: date + checkbox */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(row.date, row.hour)}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    disabled={checkboxDisabled}
                    onChange={() => (multiplaOpen || oneBookId) && handleToggleMultipla(row)}
                    aria-label={`Seleziona ${row.home} – ${row.away}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Calcolatore"
                    onClick={() => setCalculatorRow(row)}
                  >
                    <Calculator className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <table className="w-full min-w-[900px] text-sm [&_tbody_td]:border-b [&_tbody_td]:border-border [&_td:not(:last-child)]:relative [&_td:not(:last-child)]:after:absolute [&_td:not(:last-child)]:after:bottom-2 [&_td:not(:last-child)]:after:right-0 [&_td:not(:last-child)]:after:top-2 [&_td:not(:last-child)]:after:w-px [&_td:not(:last-child)]:after:bg-border/60 [&_td:not(:last-child)]:after:content-[''] [&_th:not(:last-child)]:relative [&_th:not(:last-child)]:after:absolute [&_th:not(:last-child)]:after:bottom-2 [&_th:not(:last-child)]:after:right-0 [&_th:not(:last-child)]:after:top-2 [&_th:not(:last-child)]:after:w-px [&_th:not(:last-child)]:after:bg-border/60 [&_th:not(:last-child)]:after:content-['']">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground">
              <th className="w-10 p-3 text-center font-medium" aria-label="Seleziona" />
              <th className="whitespace-nowrap p-3 text-left font-medium">Data</th>
              <th className="w-12 p-3 text-center font-medium" aria-label="Sport">
                Sport
              </th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Evento</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Torneo</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Mercato</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Esito</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Book</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Punta</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Banca</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Exchange</th>
              <th className="whitespace-nowrap p-3 text-right font-medium">Liquidità</th>
              <th className="whitespace-nowrap p-3 text-right font-medium">Rating</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Aggiornamento</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Calcolatore</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row: OddsmatcherRow, index: number) => {
              const key = oneBookId
                ? rowToKey(row)
                : `${row.home}-${row.away}-${row.selection}-${row.market}-${(page - 1) * PAGE_SIZE + index}`
              const isSelected = selectedKeysSet.has(rowToKey(row))
              const checkboxDisabled =
                (!multiplaOpen && oneBookId === null) ||
                (multiplaBookId != null && row.id_book_1 !== multiplaBookId) ||
                (!isSelected && multiplaSelectedEvents.length >= multiplaNumEventi)
              return (
                <tr
                  key={key}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent',
                    isSelected && 'bg-primary/5',
                  )}
                  onDoubleClick={() => setCalculatorRow(row)}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={checkboxDisabled}
                      onChange={() => (multiplaOpen || oneBookId) && handleToggleMultipla(row)}
                      aria-label={`Seleziona ${row.home} – ${row.away}`}
                    />
                  </td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">
                    {formatDate(row.date, row.hour)}
                  </td>
                  <td className="p-3 text-center" title={getSportDisplay(row.sport).label}>
                    {(() => {
                      const { icon } = getSportDisplay(row.sport)
                      return icon ? (
                        <span className="text-lg leading-none" aria-hidden>
                          {icon}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.sport}</span>
                      )
                    })()}
                  </td>
                  <td className="p-3 font-medium">
                    {row.home} – {row.away}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.competition}</td>
                  <td className="p-3">{row.market}</td>
                  <td className="p-3">{row.selection}</td>
                  <td className="p-3 after:hidden">
                    <Image
                      src={`/loghi_book/${row.id_book_1}.png`}
                      alt={`Book ${row.id_book_1}`}
                      width={120}
                      height={32}
                      className="h-8 w-auto max-w-[120px] object-contain"
                      loading="lazy"
                    />
                  </td>
                  <td className="border-b-0 bg-primary/20 p-3 text-center font-medium text-primary after:hidden">
                    {row.back_odd}
                  </td>
                  <td className="border-b-0 bg-destructive/20 p-3 text-center font-medium text-destructive">
                    {row.lay_odd}
                  </td>
                  <td className="p-3">
                    <Image
                      src={`/loghi_book/${row.id_book_2}.png`}
                      alt={`Exchange ${row.id_book_2}`}
                      width={120}
                      height={32}
                      className="h-8 w-auto max-w-[120px] object-contain"
                      loading="lazy"
                    />
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {formatLiquidity(row.liquidity)}
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-block rounded bg-emerald-500/15 px-2 py-1 font-mono font-medium text-emerald-400">
                      {computeRating(row.back_odd, row.lay_odd)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                    {row.last_update}
                  </td>
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Apri calcolatore"
                      onClick={() => setCalculatorRow(row)}
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {tableStart}–{tableEnd} di {tableTotal} risultati
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Pagina precedente"
          >
            <ChevronLeft className="h-4 w-4" />
            Indietro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(tablePages, p + 1))}
            disabled={page >= tablePages}
            aria-label="Pagina successiva"
          >
            Avanti
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <OddsmatcherCalculatorModal
        open={calculatorRow != null}
        onOpenChange={(open) => !open && setCalculatorRow(null)}
        row={calculatorRow}
        defaultPuntata={sharedStake}
        defaultBonus={sharedBonus}
        defaultRimborso={sharedRimborso}
      />
    </div>
  )
}

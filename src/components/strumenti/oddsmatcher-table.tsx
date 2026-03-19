'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
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
  Euro,
  Loader2,
  Percent,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { OddsmatcherCalculatorModal } from '@/components/strumenti/oddsmatcher-calculator-modal'
import { OddsmatcherMultiplaSaveModal } from '@/components/strumenti/oddsmatcher-multipla-save-modal'
import { cn } from '@/lib/utils'

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

function ratingMultipla(selected: OddsmatcherRow[]): number | null {
  if (selected.length === 0) return null
  let product = 1
  for (const row of selected) {
    const back = parseFloat(row.back_odd)
    const lay = parseFloat(row.lay_odd)
    if (Number.isNaN(back) || Number.isNaN(lay) || lay <= 0) return null
    const layEffective = lay - EXCHANGE_COMMISSION
    if (layEffective <= 0) return null
    product *= (back * (1 - EXCHANGE_COMMISSION)) / layEffective
  }
  return product * 100
}

function formatDateShort(date: string, hour: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m} ${hour}`
}

export function OddsmatcherTable() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sharedStake, setSharedStake] = useState('')
  const [sharedBonus, setSharedBonus] = useState('')
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>(() =>
    ODDSMATCHER_EXCHANGES_ONLY.map((e) => e.id),
  )
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [minLiquidity, setMinLiquidity] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minOdds, setMinOdds] = useState('')
  const [maxOdds, setMaxOdds] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [calculatorRow, setCalculatorRow] = useState<OddsmatcherRow | null>(null)
  const [multiplaNumEventi, setMultiplaNumEventi] = useState(2)
  const [multiplaQuotaMinEvento, setMultiplaQuotaMinEvento] = useState('')
  const [multiplaQuotaMinTotale, setMultiplaQuotaMinTotale] = useState('1.00')
  const [multiplaDataInizio, setMultiplaDataInizio] = useState('')
  const [multiplaDataFine, setMultiplaDataFine] = useState('')
  const startDateInputRef = useRef<HTMLInputElement>(null)
  const endDateInputRef = useRef<HTMLInputElement>(null)
  const multiplaDataInizioRef = useRef<HTMLInputElement>(null)
  const multiplaDataFineRef = useRef<HTMLInputElement>(null)
  const [multiplaSelectedEvents, setMultiplaSelectedEvents] = useState<OddsmatcherRow[]>([])
  const [multiplaSaveModalOpen, setMultiplaSaveModalOpen] = useState(false)
  const apiParams = {
    id_book: selectedBookIds.length > 0 ? selectedBookIds : undefined,
    id_exchange: selectedExchangeIds.length > 0 ? selectedExchangeIds : undefined,
  }
  const { data, isLoading, isError, error, refetch, isRefetching } = useOddsmatcher(apiParams)

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [
    data,
    searchQuery,
    selectedBookIds,
    selectedExchangeIds,
    selectedSportIds,
    selectedMarkets,
    minLiquidity,
    minRating,
    minOdds,
    maxOdds,
    startDate,
    endDate,
  ])

  useEffect(() => {
    if (selectedBookIds.length === 1) queueMicrotask(() => setPage(1))
  }, [multiplaSelectedEvents, selectedBookIds.length])

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedBookIds([])
    setSelectedExchangeIds(ODDSMATCHER_EXCHANGES_ONLY.map((e) => e.id))
    setSelectedSportIds([])
    setSelectedMarkets([])
    setMinLiquidity('')
    setMinRating('')
    setMinOdds('')
    setMaxOdds('')
    setStartDate('')
    setEndDate('')
  }

  const resetMultiplaFilters = () => {
    setMultiplaNumEventi(2)
    setMultiplaQuotaMinEvento('')
    setMultiplaQuotaMinTotale('1.00')
    setMultiplaDataInizio('')
    setMultiplaDataFine('')
  }

  const eliminaMultipla = () => {
    setMultiplaSelectedEvents([])
  }

  const rows = useMemo(() => data ?? [], [data])
  const sports = useMemo(() => [...new Set(rows.map((r) => r.sport))].sort(), [rows])
  const markets = useMemo(() => [...new Set(rows.map((r) => r.market))].sort(), [rows])

  const selectedKeysSet = useMemo(
    () => new Set(multiplaSelectedEvents.map(rowToKey)),
    [multiplaSelectedEvents],
  )
  const multiplaRating = ratingMultipla(multiplaSelectedEvents)
  const quotaMultipla =
    multiplaSelectedEvents.length > 0
      ? multiplaSelectedEvents.reduce((acc, ev) => {
          const back = parseFloat(ev.back_odd)
          return Number.isNaN(back) ? acc : acc * back
        }, 1)
      : null

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

  const filtersBarSlim = (
    <Card className="overflow-hidden border-border bg-muted/30">
      <CardContent className="space-y-3 pb-4 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca evento o torneo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Cerca per nome evento o torneo"
            />
          </div>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <Label
              htmlFor="oddsmatcher-shared-stake"
              className="whitespace-nowrap text-sm text-muted-foreground"
            >
              Puntata €
            </Label>
            <Input
              id="oddsmatcher-shared-stake"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0"
              value={sharedStake}
              onChange={(e) => setSharedStake(e.target.value)}
              className="w-24"
              aria-label="Stake condiviso per calcolatore e multipla"
            />
            <Label
              htmlFor="oddsmatcher-shared-bonus"
              className="whitespace-nowrap text-sm text-muted-foreground"
            >
              Bonus €
            </Label>
            <Input
              id="oddsmatcher-shared-bonus"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0"
              value={sharedBonus}
              onChange={(e) => setSharedBonus(e.target.value)}
              className="w-24"
              aria-label="Bonus condiviso per calcolatore e multipla"
            />
          </div>
          <SearchableMultiSelect
            options={ODDSMATCHER_BOOKS_ONLY}
            selectedIds={selectedBookIds}
            onToggle={toggleBook}
            buttonLabel={bookButtonLabel}
            searchPlaceholder="Cerca book..."
            searchInputAriaLabel="Filtra book"
            emptyMessage="Nessun book trovato"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between">
                {exchangeButtonLabel}
                <ChevronDown className="h-4 w-4 opacity-50" />
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
                    <span>{ex.name}</span>
                  </label>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => refetch()} disabled={isRefetching} variant="success">
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            REFRESH QUOTE
          </Button>
          <Button variant="outline" onClick={resetFilters} aria-label="Reset filtri">
            <RotateCcw className="h-4 w-4" />
            Reset filtri
          </Button>
        </div>
      </CardContent>
    </Card>
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
        />
      </div>
    )
  }

  const q = searchQuery.trim().toLowerCase()
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
  if (minLiquidity.trim() !== '') {
    const minLiq = parseFloat(minLiquidity)
    if (!Number.isNaN(minLiq)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.liquidity) >= minLiq)
    }
  }
  if (minRating.trim() !== '') {
    const minR = parseFloat(minRating)
    if (!Number.isNaN(minR)) {
      filteredRows = filteredRows.filter((row) => ratingValue(row.back_odd, row.lay_odd) >= minR)
    }
  }
  if (minOdds.trim() !== '') {
    const minO = parseFloat(minOdds)
    if (!Number.isNaN(minO)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.back_odd) >= minO)
    }
  }
  if (maxOdds.trim() !== '') {
    const maxO = parseFloat(maxOdds)
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

  const sortedRows = [...filteredRows].sort(
    (a, b) => ratingValue(b.back_odd, b.lay_odd) - ratingValue(a.back_odd, a.lay_odd),
  )

  const advancedFiltersSection = (
    <div className="border-t border-border pt-3">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filtri avanzati
      </p>
      <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {/* Riga 1: Sport | Quota min | Da | Liq. min — allineati orizzontalmente */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Sport</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-full min-w-0 justify-between">
                {selectedSportIds.length === 0
                  ? 'Sport'
                  : selectedSportIds.length === 1
                    ? (() => {
                        const { icon, label } = getSportDisplay(selectedSportIds[0])
                        return icon ? `${icon} ${label}` : selectedSportIds[0]
                      })()
                    : `${selectedSportIds.length} sport`}
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[240px] overflow-y-auto">
              {sports.map((s) => {
                const { icon, label } = getSportDisplay(s)
                return (
                  <DropdownMenuItem
                    key={s}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    <label className="flex w-full cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={selectedSportIds.includes(s)}
                        onChange={() => toggleSport(s)}
                      />
                      {icon && (
                        <span className="text-base" aria-hidden>
                          {icon}
                        </span>
                      )}
                      <span>{label}</span>
                    </label>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="oddsmatcher-quota-min" className="text-xs text-muted-foreground">
            Quota min
          </Label>
          <Input
            id="oddsmatcher-quota-min"
            type="number"
            placeholder="min"
            value={minOdds}
            onChange={(e) => setMinOdds(e.target.value)}
            className="h-9 w-full min-w-0"
            min={1}
            step={0.01}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="oddsmatcher-date-from" className="text-xs text-muted-foreground">
            Data evento da
          </Label>
          <div className="relative">
            <Input
              ref={startDateInputRef}
              id="oddsmatcher-date-from"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full min-w-0 pr-9"
            />
            <button
              type="button"
              onClick={() => startDateInputRef.current?.showPicker?.()}
              className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Apri selettore data"
            >
              <Calendar className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label
            htmlFor="oddsmatcher-liq-min"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Euro className="h-3.5 w-3.5 shrink-0" />
            Liq. min
          </Label>
          <Input
            id="oddsmatcher-liq-min"
            type="number"
            placeholder="€"
            value={minLiquidity}
            onChange={(e) => setMinLiquidity(e.target.value)}
            className="h-9 w-full min-w-0"
            min={0}
            step={1}
          />
        </div>
        {/* Riga 2: Mercati | Quota max | A | Rating min — allineati orizzontalmente */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Mercati</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-full min-w-0 justify-between">
                {selectedMarkets.length === 0
                  ? 'Mercati'
                  : selectedMarkets.length === 1
                    ? selectedMarkets[0]
                    : `${selectedMarkets.length} mercati`}
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[240px] overflow-y-auto">
              {markets.map((m) => (
                <DropdownMenuItem
                  key={m}
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer"
                >
                  <label className="flex w-full cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={selectedMarkets.includes(m)}
                      onChange={() => toggleMarket(m)}
                    />
                    <span>{m}</span>
                  </label>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="oddsmatcher-quota-max" className="text-xs text-muted-foreground">
            Quota max
          </Label>
          <Input
            id="oddsmatcher-quota-max"
            type="number"
            placeholder="max"
            value={maxOdds}
            onChange={(e) => setMaxOdds(e.target.value)}
            className="h-9 w-full min-w-0"
            min={1}
            step={0.01}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="oddsmatcher-date-to" className="text-xs text-muted-foreground">
            Data evento a
          </Label>
          <div className="relative">
            <Input
              ref={endDateInputRef}
              id="oddsmatcher-date-to"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full min-w-0 pr-9"
            />
            <button
              type="button"
              onClick={() => endDateInputRef.current?.showPicker?.()}
              className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Apri selettore data"
            >
              <Calendar className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label
            htmlFor="oddsmatcher-rating-min"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Percent className="h-3.5 w-3.5 shrink-0" />
            Rating min
          </Label>
          <Input
            id="oddsmatcher-rating-min"
            type="number"
            placeholder="%"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="h-9 w-full min-w-0"
            min={0}
            max={100}
            step={0.1}
          />
        </div>
      </div>
    </div>
  )

  const multiplaSection = (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Multipla</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="multipla-n-eventi" className="text-xs text-muted-foreground">
            N. Eventi
          </Label>
          <select
            id="multipla-n-eventi"
            value={multiplaNumEventi}
            onChange={(e) => setMultiplaNumEventi(Number(e.target.value))}
            className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="multipla-quota-min-evento" className="text-xs text-muted-foreground">
            Quota min evento
          </Label>
          <Input
            id="multipla-quota-min-evento"
            type="number"
            placeholder="—"
            value={multiplaQuotaMinEvento}
            onChange={(e) => setMultiplaQuotaMinEvento(e.target.value)}
            className="w-full min-w-0"
            min={1}
            step={0.01}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="multipla-quota-min-totale" className="text-xs text-muted-foreground">
            Quota min totale
          </Label>
          <Input
            id="multipla-quota-min-totale"
            type="number"
            value={multiplaQuotaMinTotale}
            onChange={(e) => setMultiplaQuotaMinTotale(e.target.value)}
            className="w-full min-w-0"
            min={1}
            step={0.01}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="multipla-data-inizio" className="text-xs text-muted-foreground">
            Data inizio
          </Label>
          <div className="relative">
            <Input
              ref={multiplaDataInizioRef}
              id="multipla-data-inizio"
              type="date"
              value={multiplaDataInizio}
              onChange={(e) => setMultiplaDataInizio(e.target.value)}
              className="w-full min-w-0 pr-9"
            />
            <button
              type="button"
              onClick={() => multiplaDataInizioRef.current?.showPicker?.()}
              className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Apri selettore data"
            >
              <Calendar className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="multipla-data-fine" className="text-xs text-muted-foreground">
            Data fine
          </Label>
          <div className="relative">
            <Input
              ref={multiplaDataFineRef}
              id="multipla-data-fine"
              type="date"
              value={multiplaDataFine}
              onChange={(e) => setMultiplaDataFine(e.target.value)}
              className="w-full min-w-0 pr-9"
            />
            <button
              type="button"
              onClick={() => multiplaDataFineRef.current?.showPicker?.()}
              className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Apri selettore data"
            >
              <Calendar className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const eventiSelezionatiPanel = (
    <div className="flex flex-col items-stretch gap-3">
      <div className="min-w-[220px] rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Eventi selezionati</p>
        <p className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Rating multipla: {multiplaRating != null ? `${multiplaRating.toFixed(2)}%` : '—'}
          {quotaMultipla != null && ` · Quota: ${quotaMultipla.toFixed(2)}`}
        </p>
        {multiplaSelectedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Seleziona il book dalla tendina e clicca sugli eventi in tabella per aggiungerli.
          </p>
        ) : (
          <ul className="space-y-2">
            {multiplaSelectedEvents.map((ev) => (
              <li
                key={rowToKey(ev)}
                className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                <span className="truncate">
                  {ev.home} – {ev.away} ({formatDateShort(ev.date, ev.hour)})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  aria-label="Rimuovi"
                  onClick={() =>
                    setMultiplaSelectedEvents((prev) =>
                      prev.filter((r) => rowToKey(r) !== rowToKey(ev)),
                    )
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={resetMultiplaFilters}>
          <RotateCcw className="h-3.5 w-3.5" /> RESET
        </Button>
        <Button variant="destructive" size="sm" onClick={eliminaMultipla}>
          <X className="h-3.5 w-3.5" /> ELIMINA
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
          disabled={
            multiplaSelectedEvents.length !== multiplaNumEventi ||
            ((Number.parseFloat(sharedStake) || 0) <= 0 &&
              (Number.parseFloat(sharedBonus) || 0) <= 0)
          }
          aria-label="Salva multipla"
          onClick={() => setMultiplaSaveModalOpen(true)}
        >
          SALVA
        </Button>
      </div>
    </div>
  )

  const mainCard = (
    <Card variant="elevated" className="overflow-hidden border border-border bg-muted/30">
      <CardContent className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-start">
        <div className="space-y-4">
          {multiplaSection}
          {advancedFiltersSection}
        </div>
        <div className="border-l border-border pl-4">{eventiSelezionatiPanel}</div>
      </CardContent>
    </Card>
  )

  if (isRefetching) {
    return (
      <div className="space-y-4">
        {mainCard}
        {loadingBlock}
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
          defaultPuntata={sharedStake}
          defaultBonus={sharedBonus}
        />
      </div>
    )
  }

  if (filteredRows.length === 0) {
    return (
      <div className="space-y-4">
        {mainCard}
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
        />
      </div>
    )
  }

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE)
  const paginatedRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, sortedRows.length)

  const oneBookId = selectedBookIds.length === 1 ? selectedBookIds[0] : null
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
    const selectedKeys = new Set(multiplaSelectedEvents.map(rowToKey))
    multiplaAvailableRows = multiplaAvailableRows.filter((row) => !selectedKeys.has(rowToKey(row)))
    multiplaAvailableRows = [...multiplaAvailableRows].sort(
      (a, b) => ratingValue(b.back_odd, b.lay_odd) - ratingValue(a.back_odd, a.lay_odd),
    )
  }
  // Eventi selezionati ancorati in cima, in ordine cronologico
  const anchoredRows =
    oneBookId && multiplaSelectedEvents.length > 0
      ? [...multiplaSelectedEvents].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          return a.hour.localeCompare(b.hour)
        })
      : []
  const fullMultiplaRows = oneBookId ? [...anchoredRows, ...multiplaAvailableRows] : []
  const multiplaTotalPages = Math.ceil(fullMultiplaRows.length / PAGE_SIZE)
  const multiplaPaginatedRows = fullMultiplaRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const multiplaStart = fullMultiplaRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const multiplaEnd = Math.min(page * PAGE_SIZE, fullMultiplaRows.length)

  const toggleMultiplaEvent = (row: OddsmatcherRow) => {
    const key = rowToKey(row)
    if (selectedKeysSet.has(key)) {
      setMultiplaSelectedEvents((prev) => prev.filter((r) => rowToKey(r) !== key))
    } else if (multiplaSelectedEvents.length < multiplaNumEventi) {
      setMultiplaSelectedEvents((prev) => [...prev, row])
    }
  }

  const tableRows = oneBookId ? multiplaPaginatedRows : paginatedRows
  const tableTotal = oneBookId ? fullMultiplaRows.length : sortedRows.length
  const tablePages = oneBookId ? multiplaTotalPages : totalPages
  const tableStart = oneBookId ? multiplaStart : start
  const tableEnd = oneBookId ? multiplaEnd : end

  return (
    <div className="space-y-4">
      {mainCard}
      {filtersBarSlim}
      {oneBookId === null && (
        <div className="rounded-md border border-border bg-muted/30 p-6 text-center text-muted-foreground">
          Seleziona un solo book dalla tendina per compilare la multipla.
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
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
                oneBookId === null ||
                (!isSelected && multiplaSelectedEvents.length >= multiplaNumEventi)
              return (
                <tr
                  key={key}
                  className={cn(
                    'cursor-pointer',
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                  )}
                  onDoubleClick={() => setCalculatorRow(row)}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={checkboxDisabled}
                      onChange={() => oneBookId && toggleMultiplaEvent(row)}
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
                    <span className="inline-block rounded bg-emerald-600/20 px-2 py-1 font-medium text-emerald-600 dark:text-emerald-400">
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
      />
      <OddsmatcherMultiplaSaveModal
        open={multiplaSaveModalOpen}
        onOpenChange={setMultiplaSaveModalOpen}
        selectedEvents={multiplaSelectedEvents}
        bookOddsId={oneBookId ?? ''}
        exchangeOddsId={multiplaSelectedEvents[0]?.id_book_2 ?? ''}
        sharedStake={sharedStake}
        sharedBonus={sharedBonus}
      />
    </div>
  )
}

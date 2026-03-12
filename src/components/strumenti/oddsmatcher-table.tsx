'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

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
  return (back / lay) * 100
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
    product *= back / lay
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
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>([])
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
  const [multiplaSelectedEvents, setMultiplaSelectedEvents] = useState<OddsmatcherRow[]>([])

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

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedBookIds([])
    setSelectedExchangeIds([])
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

  const filtersBarSlim = (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ricerca e fonti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4 pt-0">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between">
                {selectedBookIds.length === 0
                  ? 'Book'
                  : selectedBookIds.length === 1
                    ? (ODDSMATCHER_BOOKS_ONLY.find((b) => b.id === selectedBookIds[0])?.name ??
                      'Book')
                    : `${selectedBookIds.length} book`}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[280px] overflow-y-auto">
              {ODDSMATCHER_BOOKS_ONLY.map((book) => (
                <DropdownMenuItem
                  key={book.id}
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer"
                >
                  <label className="flex w-full cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={selectedBookIds.includes(book.id)}
                      onChange={() => toggleBook(book.id)}
                    />
                    <span>{book.name}</span>
                  </label>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between">
                {selectedExchangeIds.length === 0
                  ? 'Exchange'
                  : selectedExchangeIds.length === 1
                    ? (ODDSMATCHER_EXCHANGES_ONLY.find((e) => e.id === selectedExchangeIds[0])
                        ?.name ?? 'Exchange')
                    : `${selectedExchangeIds.length} exchange`}
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
        />
      </div>
    )
  }

  if (rows.length === 0) {
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

  const sortedRows = [...filteredRows].sort(
    (a, b) => ratingValue(b.back_odd, b.lay_odd) - ratingValue(a.back_odd, a.lay_odd),
  )

  const advancedFiltersSection = (
    <div className="border-t border-border pt-3">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filtri avanzati
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[100px] justify-between">
              {selectedSportIds.length === 0
                ? 'Sport'
                : selectedSportIds.length === 1
                  ? selectedSportIds[0]
                  : `${selectedSportIds.length} sport`}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[240px] overflow-y-auto">
            {sports.map((s) => (
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
                  <span>Sport {s}</span>
                </label>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[100px] justify-between">
              {selectedMarkets.length === 0
                ? 'Mercati'
                : selectedMarkets.length === 1
                  ? selectedMarkets[0]
                  : `${selectedMarkets.length} mercati`}
              <ChevronDown className="h-4 w-4 opacity-50" />
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
        <div className="flex items-center gap-2">
          <Label
            htmlFor="oddsmatcher-liq-min"
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <Euro className="h-3.5 w-3.5" />
            Liq. min
          </Label>
          <Input
            id="oddsmatcher-liq-min"
            type="number"
            placeholder="€"
            value={minLiquidity}
            onChange={(e) => setMinLiquidity(e.target.value)}
            className="w-20"
            min={0}
            step={1}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="oddsmatcher-rating-min"
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <Percent className="h-3.5 w-3.5" />
            Rating min %
          </Label>
          <Input
            id="oddsmatcher-rating-min"
            type="number"
            placeholder="%"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="w-16"
            min={0}
            max={100}
            step={0.1}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="oddsmatcher-quota-min"
              className="whitespace-nowrap text-muted-foreground"
            >
              Quota min
            </Label>
            <Input
              id="oddsmatcher-quota-min"
              type="number"
              placeholder="min"
              value={minOdds}
              onChange={(e) => setMinOdds(e.target.value)}
              className="w-16"
              min={1}
              step={0.01}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="oddsmatcher-quota-max"
              className="whitespace-nowrap text-muted-foreground"
            >
              Quota max
            </Label>
            <Input
              id="oddsmatcher-quota-max"
              type="number"
              placeholder="max"
              value={maxOdds}
              onChange={(e) => setMaxOdds(e.target.value)}
              className="w-16"
              min={1}
              step={0.01}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label
            htmlFor="oddsmatcher-date-from"
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            Da
          </Label>
          <Input
            id="oddsmatcher-date-from"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
          <Label htmlFor="oddsmatcher-date-to" className="whitespace-nowrap text-muted-foreground">
            A
          </Label>
          <Input
            id="oddsmatcher-date-to"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
        </div>
      </div>
    </div>
  )

  const multiplaSection = (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Multipla</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="multipla-n-eventi" className="text-xs text-muted-foreground">
            N. Eventi
          </Label>
          <select
            id="multipla-n-eventi"
            value={multiplaNumEventi}
            onChange={(e) => setMultiplaNumEventi(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="multipla-quota-min-evento" className="text-xs text-muted-foreground">
            Quota min evento
          </Label>
          <Input
            id="multipla-quota-min-evento"
            type="number"
            placeholder="—"
            value={multiplaQuotaMinEvento}
            onChange={(e) => setMultiplaQuotaMinEvento(e.target.value)}
            className="w-24"
            min={1}
            step={0.01}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="multipla-quota-min-totale" className="text-xs text-muted-foreground">
            Quota min totale
          </Label>
          <Input
            id="multipla-quota-min-totale"
            type="number"
            value={multiplaQuotaMinTotale}
            onChange={(e) => setMultiplaQuotaMinTotale(e.target.value)}
            className="w-24"
            min={1}
            step={0.01}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="multipla-data-inizio" className="text-xs text-muted-foreground">
            Data inizio
          </Label>
          <Input
            id="multipla-data-inizio"
            type="date"
            value={multiplaDataInizio}
            onChange={(e) => setMultiplaDataInizio(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="multipla-data-fine" className="text-xs text-muted-foreground">
            Data fine
          </Label>
          <Input
            id="multipla-data-fine"
            type="date"
            value={multiplaDataFine}
            onChange={(e) => setMultiplaDataFine(e.target.value)}
            className="w-36"
          />
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
        <Button variant="outline" size="sm" onClick={eliminaMultipla}>
          <X className="h-3.5 w-3.5" /> ELIMINA
        </Button>
        <Button variant="outline" size="sm" disabled aria-label="Salva (non implementato)">
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
        />
      </div>
    )
  }

  if (filteredRows.length === 0) {
    return (
      <div className="space-y-4">
        {mainCard}
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          Nessun risultato
          {searchQuery.trim() && ` per "${searchQuery.trim()}"`}. Prova a modificare ricerca o
          filtri.
        </div>
        <OddsmatcherCalculatorModal
          open={calculatorRow != null}
          onOpenChange={(open) => !open && setCalculatorRow(null)}
          row={calculatorRow}
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
    multiplaAvailableRows = rows.filter((r) => r.id_book_1 === oneBookId)
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
  const multiplaTotalPages = Math.ceil(multiplaAvailableRows.length / PAGE_SIZE)
  const multiplaPaginatedRows = multiplaAvailableRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  )
  const multiplaStart = (page - 1) * PAGE_SIZE + 1
  const multiplaEnd = Math.min(page * PAGE_SIZE, multiplaAvailableRows.length)

  const toggleMultiplaEvent = (row: OddsmatcherRow) => {
    const key = rowToKey(row)
    if (selectedKeysSet.has(key)) {
      setMultiplaSelectedEvents((prev) => prev.filter((r) => rowToKey(r) !== key))
    } else if (multiplaSelectedEvents.length < multiplaNumEventi) {
      setMultiplaSelectedEvents((prev) => [...prev, row])
    }
  }

  const tableRows = oneBookId ? multiplaPaginatedRows : paginatedRows
  const tableTotal = oneBookId ? multiplaAvailableRows.length : sortedRows.length
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
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground">
              <th className="w-10 p-3 text-center font-medium" aria-label="Seleziona" />
              <th className="whitespace-nowrap p-3 text-left font-medium">Data</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Evento</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Torneo</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Mercato</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Esito</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Book</th>
              <th className="whitespace-nowrap p-3 text-right font-medium">Punta</th>
              <th className="whitespace-nowrap p-3 text-right font-medium">Banca</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Exchange</th>
              <th className="whitespace-nowrap p-3 text-right font-medium">LiquiditÃ </th>
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
                    'cursor-pointer border-b border-border',
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
                  <td className="p-3 font-medium">
                    {row.home} – {row.away}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.competition}</td>
                  <td className="p-3">{row.market}</td>
                  <td className="p-3">{row.selection}</td>
                  <td className="p-3">
                    <Image
                      src={`/loghi_book/${row.id_book_1}.png`}
                      alt={`Book ${row.id_book_1}`}
                      width={120}
                      height={32}
                      className="h-8 w-auto max-w-[120px] object-contain"
                      loading="lazy"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-block rounded bg-primary/20 px-2 py-1 font-medium text-primary">
                      {row.back_odd}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-block rounded bg-destructive/20 px-2 py-1 font-medium text-destructive">
                      {row.lay_odd}
                    </span>
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
      />
    </div>
  )
}

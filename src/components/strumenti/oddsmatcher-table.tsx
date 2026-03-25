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
import { OddsmatcherMultiplaSaveModal } from '@/components/strumenti/oddsmatcher-multipla-save-modal'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
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
  const [sharedRimborso, setSharedRimborso] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [multiplaOpen, setMultiplaOpen] = useState(false)
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
  const [multiplaQuotaMaxEvento, setMultiplaQuotaMaxEvento] = useState('')
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
    setMultiplaNumEventi(2)
    setMultiplaQuotaMinEvento('')
    setMultiplaQuotaMaxEvento('')
    setMultiplaQuotaMinTotale('1.00')
    setMultiplaDataInizio('')
    setMultiplaDataFine('')
  }

  const resetMultiplaFilters = () => {
    setMultiplaNumEventi(2)
    setMultiplaQuotaMinEvento('')
    setMultiplaQuotaMaxEvento('')
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
      multiplaSelectedEvents.map((row) => ({
        layOdds: parseFloat(row.lay_odd),
        commissionPercent: EXCHANGE_COMMISSION * 100,
      })),
      rimborso,
    )
    const totalLiability = results.reduce((sum, r) => sum + r.liability, 0)
    return backStakeTotale * quotaMultipla - stake - totalLiability
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
      {/* Main bar */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca evento o torneo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border-0 bg-transparent pl-8 text-sm focus-visible:ring-0"
            aria-label="Cerca per nome evento o torneo"
          />
        </div>

        <div className="hidden h-5 w-px bg-border sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Puntata</span>
          <Input
            id="oddsmatcher-shared-stake"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="€"
            value={sharedStake}
            onChange={(e) => setSharedStake(e.target.value)}
            className="h-8 w-20 text-sm"
            aria-label="Stake"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Bonus</span>
          <Input
            id="oddsmatcher-shared-bonus"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="€"
            value={sharedBonus}
            onChange={(e) => setSharedBonus(e.target.value)}
            className="h-8 w-20 text-sm"
            aria-label="Bonus"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Rimborso</span>
          <Input
            id="oddsmatcher-shared-rimborso"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="€"
            value={sharedRimborso}
            onChange={(e) => setSharedRimborso(e.target.value)}
            className="h-8 w-20 text-sm"
            aria-label="Rimborso"
          />
        </div>

        <div className="hidden h-5 w-px bg-border sm:block" />

        <SearchableMultiSelect
          options={ODDSMATCHER_BOOKS_ONLY}
          selectedIds={selectedBookIds}
          onToggle={toggleBook}
          buttonLabel={bookButtonLabel}
          searchPlaceholder="Cerca book..."
          searchInputAriaLabel="Filtra book"
          emptyMessage="Nessun book trovato"
          size="sm"
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
                  <span>{ex.name}</span>
                </label>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden h-5 w-px bg-border sm:block" />

        <button
          type="button"
          onClick={() => {
            if (filtersOpen) {
              setFiltersOpen(false)
            } else {
              if (multiplaOpen) {
                resetMultiplaFilters()
                eliminaMultipla()
                setMultiplaOpen(false)
              }
              setFiltersOpen(true)
            }
          }}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all',
            filtersOpen
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtri
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (multiplaOpen) {
              setMultiplaOpen(false)
            } else {
              if (filtersOpen) {
                resetFilters()
                setFiltersOpen(false)
              }
              setMultiplaOpen(true)
            }
          }}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all',
            multiplaOpen
              ? 'border-neon-lavender/30 bg-neon-lavender/10 text-neon-lavender'
              : 'border-border text-muted-foreground hover:border-neon-lavender/20 hover:text-foreground',
          )}
        >
          Multipla
          {multiplaSelectedEvents.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-lavender px-1 text-[10px] font-bold text-background">
              {multiplaSelectedEvents.length}/{multiplaNumEventi}
            </span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => refetch()}
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

      {/* Active filter chips */}
      {activeFilterCount > 0 && !filtersOpen && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-2">
          {selectedSportIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              Sport: {selectedSportIds.map((s) => getSportDisplay(s).label).join(', ')}
              <button
                type="button"
                onClick={() => setSelectedSportIds([])}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {selectedMarkets.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              Mercati: {selectedMarkets.length}
              <button
                type="button"
                onClick={() => setSelectedMarkets([])}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {(minOdds.trim() || maxOdds.trim()) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              Quote: {minOdds || '—'} – {maxOdds || '—'}
              <button
                type="button"
                onClick={() => {
                  setMinOdds('')
                  setMaxOdds('')
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {(startDate.trim() || endDate.trim()) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              Date: {startDate || '—'} → {endDate || '—'}
              <button
                type="button"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {minLiquidity.trim() && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              Liq. ≥ €{minLiquidity}
              <button
                type="button"
                onClick={() => setMinLiquidity('')}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {minRating.trim() && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              Rating ≥ {minRating}%
              <button
                type="button"
                onClick={() => setMinRating('')}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Advanced filters panel (collapsible) */}
      {filtersOpen && (
        <div className="mt-2 animate-fade-in rounded-xl border border-border bg-surface-1 p-4">
          <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Sport
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full min-w-0 justify-between text-xs"
                  >
                    {selectedSportIds.length === 0
                      ? 'Tutti'
                      : selectedSportIds.length === 1
                        ? (() => {
                            const { icon, label } = getSportDisplay(selectedSportIds[0])
                            return icon ? `${icon} ${label}` : selectedSportIds[0]
                          })()
                        : `${selectedSportIds.length} sport`}
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
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
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Mercati
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full min-w-0 justify-between text-xs"
                  >
                    {selectedMarkets.length === 0
                      ? 'Tutti'
                      : selectedMarkets.length === 1
                        ? selectedMarkets[0]
                        : `${selectedMarkets.length} mercati`}
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
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
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="oddsmatcher-quota-min"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Quota min
              </Label>
              <Input
                id="oddsmatcher-quota-min"
                type="number"
                placeholder="min"
                value={minOdds}
                onChange={(e) => setMinOdds(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="oddsmatcher-quota-max"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Quota max
              </Label>
              <Input
                id="oddsmatcher-quota-max"
                type="number"
                placeholder="max"
                value={maxOdds}
                onChange={(e) => setMaxOdds(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="oddsmatcher-date-from"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Data da
              </Label>
              <div className="relative">
                <Input
                  ref={startDateInputRef}
                  id="oddsmatcher-date-from"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-full min-w-0 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => startDateInputRef.current?.showPicker?.()}
                  className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Apri selettore data"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="oddsmatcher-date-to"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Data a
              </Label>
              <div className="relative">
                <Input
                  ref={endDateInputRef}
                  id="oddsmatcher-date-to"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 w-full min-w-0 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => endDateInputRef.current?.showPicker?.()}
                  className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Apri selettore data"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="oddsmatcher-liq-min"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Liq. min €
              </Label>
              <Input
                id="oddsmatcher-liq-min"
                type="number"
                placeholder="€"
                value={minLiquidity}
                onChange={(e) => setMinLiquidity(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={0}
                step={1}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="oddsmatcher-rating-min"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Rating min %
              </Label>
              <Input
                id="oddsmatcher-rating-min"
                type="number"
                placeholder="%"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={0}
                max={100}
                step={0.1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Multipla panel (collapsible) */}
      {multiplaOpen && (
        <div className="mt-2 animate-fade-in rounded-xl border border-neon-lavender/20 bg-surface-1 p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="multipla-n-eventi"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    N. Eventi
                  </Label>
                  <select
                    id="multipla-n-eventi"
                    value={multiplaNumEventi}
                    onChange={(e) => setMultiplaNumEventi(Number(e.target.value))}
                    className="h-8 w-full min-w-0 rounded-lg border border-border bg-surface-1 px-3 text-sm text-foreground"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="multipla-quota-min-evento"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Quota min evento
                  </Label>
                  <Input
                    id="multipla-quota-min-evento"
                    type="number"
                    placeholder="—"
                    value={multiplaQuotaMinEvento}
                    onChange={(e) => setMultiplaQuotaMinEvento(e.target.value)}
                    onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                    className="h-8 w-full min-w-0 text-sm"
                    min={1}
                    step={0.01}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="multipla-quota-max-evento"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Quota max evento
                  </Label>
                  <Input
                    id="multipla-quota-max-evento"
                    type="number"
                    placeholder="—"
                    value={multiplaQuotaMaxEvento}
                    onChange={(e) => setMultiplaQuotaMaxEvento(e.target.value)}
                    onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                    className="h-8 w-full min-w-0 text-sm"
                    min={1}
                    step={0.01}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="multipla-quota-min-totale"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Quota min totale
                  </Label>
                  <Input
                    id="multipla-quota-min-totale"
                    type="number"
                    value={multiplaQuotaMinTotale}
                    onChange={(e) => setMultiplaQuotaMinTotale(e.target.value)}
                    onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                    className="h-8 w-full min-w-0 text-sm"
                    min={1}
                    step={0.01}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 sm:max-w-sm">
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="multipla-data-inizio"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Data inizio
                  </Label>
                  <div className="relative">
                    <Input
                      ref={multiplaDataInizioRef}
                      id="multipla-data-inizio"
                      type="date"
                      value={multiplaDataInizio}
                      onChange={(e) => setMultiplaDataInizio(e.target.value)}
                      className="h-8 w-full min-w-0 pr-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => multiplaDataInizioRef.current?.showPicker?.()}
                      className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      aria-label="Apri selettore data"
                    >
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="multipla-data-fine"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Data fine
                  </Label>
                  <div className="relative">
                    <Input
                      ref={multiplaDataFineRef}
                      id="multipla-data-fine"
                      type="date"
                      value={multiplaDataFine}
                      onChange={(e) => setMultiplaDataFine(e.target.value)}
                      className="h-8 w-full min-w-0 pr-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => multiplaDataFineRef.current?.showPicker?.()}
                      className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      aria-label="Apri selettore data"
                    >
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Eventi selezionati — inline sidebar */}
            <div className="flex flex-col gap-2 border-t border-border pt-3 lg:min-w-[240px] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Eventi selezionati
                </p>
                <p className="font-mono text-sm font-semibold text-emerald-400">
                  {multiplaRating != null ? `${multiplaRating.toFixed(2)}%` : '—'}
                  {quotaMultipla != null && (
                    <span className="ml-1.5 text-muted-foreground">
                      · {quotaMultipla.toFixed(2)}
                    </span>
                  )}
                  {guadagnoMultipla != null && (
                    <span
                      className={cn(
                        'ml-1.5',
                        guadagnoMultipla >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      · {guadagnoMultipla >= 0 ? '+' : ''}
                      {guadagnoMultipla.toFixed(2)} €
                    </span>
                  )}
                </p>
              </div>
              {multiplaSelectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Seleziona un book e clicca sugli eventi.
                </p>
              ) : (
                <ul className="space-y-1">
                  {multiplaSelectedEvents.map((ev) => (
                    <li
                      key={rowToKey(ev)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      <span className="truncate">
                        {ev.home} – {ev.away}{' '}
                        <span className="text-muted-foreground">
                          ({formatDateShort(ev.date, ev.hour)})
                        </span>
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Rimuovi"
                        onClick={() =>
                          setMultiplaSelectedEvents((prev) =>
                            prev.filter((r) => rowToKey(r) !== rowToKey(ev)),
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetMultiplaFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="inline h-3 w-3" /> Reset
                </button>
                <button
                  type="button"
                  onClick={eliminaMultipla}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  <X className="inline h-3 w-3" /> Elimina
                </button>
                <Button
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  disabled={
                    multiplaSelectedEvents.length !== multiplaNumEventi ||
                    ((Number.parseFloat(sharedStake) || 0) <= 0 &&
                      (Number.parseFloat(sharedBonus) || 0) <= 0) ||
                    (multiplaQuotaMinTotale.trim() !== '' &&
                      quotaMultipla != null &&
                      quotaMultipla < (Number.parseFloat(multiplaQuotaMinTotale) || 0))
                  }
                  onClick={() => setMultiplaSaveModalOpen(true)}
                >
                  Salva
                </Button>
              </div>
              {multiplaSelectedEvents.length === multiplaNumEventi &&
                multiplaQuotaMinTotale.trim() !== '' &&
                quotaMultipla != null &&
                quotaMultipla < (Number.parseFloat(multiplaQuotaMinTotale) || 0) && (
                  <p className="text-[11px] text-amber-500">
                    Quota totale {quotaMultipla.toFixed(2)} inferiore alla minima (
                    {multiplaQuotaMinTotale}).
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
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
    if (multiplaQuotaMaxEvento.trim() !== '') {
      const maxQ = parseFloat(multiplaQuotaMaxEvento)
      if (!Number.isNaN(maxQ)) {
        multiplaAvailableRows = multiplaAvailableRows.filter(
          (row) => parseFloat(row.back_odd) <= maxQ,
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
      {filtersBarSlim}
      {oneBookId === null && (
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
                    onChange={() => oneBookId && toggleMultiplaEvent(row)}
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
                oneBookId === null ||
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
      <OddsmatcherMultiplaSaveModal
        open={multiplaSaveModalOpen}
        onOpenChange={setMultiplaSaveModalOpen}
        selectedEvents={multiplaSelectedEvents}
        bookOddsId={oneBookId ?? ''}
        exchangeOddsId={multiplaSelectedEvents[0]?.id_book_2 ?? ''}
        sharedStake={sharedStake}
        sharedBonus={sharedBonus}
        sharedRimborso={sharedRimborso}
      />
    </div>
  )
}

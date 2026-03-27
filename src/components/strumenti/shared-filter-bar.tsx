'use client'

import { useRef } from 'react'
import type { SharedFilters } from '@/types/shared-filters'
import { multiplaEventKey } from '@/types/multipla-event'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SPORT_LABELS: Record<string, { label: string; icon: string }> = {
  '0': { label: 'Calcio', icon: '\u26BD' },
  '1': { label: 'Tennis', icon: '\uD83C\uDFBE' },
  '2': { label: 'Basket', icon: '\uD83C\uDFC0' },
}

function getSportDisplay(sportId: string) {
  return SPORT_LABELS[sportId] ?? { label: `Sport ${sportId}`, icon: '' }
}

interface SharedFilterBarProps {
  filters: SharedFilters
  sports: string[]
  markets: string[]
}

export function SharedFilterBar({ filters, sports, markets }: SharedFilterBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    sharedStake,
    setSharedStake,
    sharedBonus,
    setSharedBonus,
    sharedRimborso,
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
    multiplaSelectedEvents,
    resetMultiplaFilters,
  } = filters

  const startDateInputRef = useRef<HTMLInputElement>(null)
  const endDateInputRef = useRef<HTMLInputElement>(null)

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

  return (
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

        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
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
              if (filtersOpen) setFiltersOpen(false)
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

      {/* Advanced filters panel */}
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
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Quota min
              </Label>
              <Input
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
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Quota max
              </Label>
              <Input
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
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Data da
              </Label>
              <div className="relative">
                <Input
                  ref={startDateInputRef}
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
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Data a
              </Label>
              <div className="relative">
                <Input
                  ref={endDateInputRef}
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
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Liq. min €
              </Label>
              <Input
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
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Rating min %
              </Label>
              <Input
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
    </div>
  )
}

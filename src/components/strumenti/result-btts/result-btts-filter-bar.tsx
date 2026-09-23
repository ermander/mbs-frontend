'use client'

import { RefreshCw, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ageLabel, ageSeconds, formatClock } from '@/lib/matcher/format'
import type { ResultBttsMeta } from '@/types/result-btts'

/** The filters of «Risultato + Goal» (§14.177): search, a day range on the kickoff, the order. Every field is a query parameter of GET /tools/result-btts. */
export interface ResultBttsUiFilters {
  search: string
  /** «YYYY-MM-DD» from a date input: the whole local day, whatever the kickoff hour. */
  startFrom: string
  startTo: string
  sortBy: 'rating' | 'start_time'
}

export const EMPTY_RESULT_BTTS_FILTERS: ResultBttsUiFilters = {
  search: '',
  startFrom: '',
  startTo: '',
  sortBy: 'rating',
}

interface ResultBttsFilterBarProps {
  filters: ResultBttsUiFilters
  onChange: (patch: Partial<ResultBttsUiFilters>) => void
  onReset: () => void
  onRefresh: () => void
  meta: ResultBttsMeta | null
  loading: boolean
  /** ISO of the snapshot behind the rows, for the «aggiornato» note. */
  calculatedAt: string | null
  now: number
}

export function ResultBttsFilterBar({
  filters,
  onChange,
  onReset,
  onRefresh,
  meta,
  loading,
  calculatedAt,
  now,
}: ResultBttsFilterBarProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="rb-search" className="text-[11px] text-muted-foreground">
            Cerca
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="rb-search"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Squadra o competizione"
              className="h-8 pl-7"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rb-from" className="text-[11px] text-muted-foreground">
            Dal giorno
          </Label>
          <Input
            id="rb-from"
            type="date"
            value={filters.startFrom}
            onChange={(e) => onChange({ startFrom: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rb-to" className="text-[11px] text-muted-foreground">
            Al giorno
          </Label>
          <Input
            id="rb-to"
            type="date"
            value={filters.startTo}
            onChange={(e) => onChange({ startTo: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rb-sort" className="text-[11px] text-muted-foreground">
            Ordina per
          </Label>
          <select
            id="rb-sort"
            value={filters.sortBy}
            onChange={(e) =>
              onChange({ sortBy: e.target.value === 'start_time' ? 'start_time' : 'rating' })
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="rating">Rating (decrescente)</option>
            <option value="start_time">Calcio d&apos;inizio</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {calculatedAt && (
            <span
              className="text-[11px] text-muted-foreground"
              title={`Quote lette alle ${formatClock(calculatedAt)}`}
            >
              {meta ? `${meta.totalResults} confronti` : ''} · aggiornato{' '}
              {ageLabel(ageSeconds(calculatedAt, now))} fa
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onReset} aria-label="Azzera i filtri">
            <RotateCcw className="h-3.5 w-3.5" />
            Azzera
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh quote"
          >
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Refresh quote
          </Button>
        </div>
      </div>
    </div>
  )
}

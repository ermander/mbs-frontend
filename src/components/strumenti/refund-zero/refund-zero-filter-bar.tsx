'use client'

import { RefreshCw, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ageLabel, ageSeconds, formatClock } from '@/lib/matcher/format'
import { dayOptions } from '@/lib/result-btts'
import { DEFAULT_REFUND_ZERO_COMMISSION_PCT, DEFAULT_REFUND_ZERO_STAKE } from '@/lib/refund-zero'
import type { RefundZeroMarket, RefundZeroMeta } from '@/types/refund-zero'

/**
 * The filters of «Rimborso 0-0» (§14.288): the stake and the exchange
 * commission the numbers are computed for, the search, a day range on the
 * kickoff, the order. Every field is a query parameter of GET /tools/refund-zero.
 */
export interface RefundZeroUiFilters {
  /** As typed; parsed by the tool. */
  stake: string
  /** Percent, as typed («2» = 2 %). */
  commissionPct: string
  search: string
  /** «YYYY-MM-DD» from the day selects (empty: any day). */
  startFrom: string
  startTo: string
  sortBy: 'profit' | 'start_time'
  /** «» = both markets (§14.294). */
  market: '' | RefundZeroMarket
  /** Only the rows whose best line is at a profit. */
  onlyPositive: boolean
}

export const EMPTY_REFUND_ZERO_FILTERS: RefundZeroUiFilters = {
  stake: String(DEFAULT_REFUND_ZERO_STAKE),
  commissionPct: String(DEFAULT_REFUND_ZERO_COMMISSION_PCT),
  search: '',
  startFrom: '',
  startTo: '',
  sortBy: 'profit',
  market: '',
  onlyPositive: false,
}

interface RefundZeroFilterBarProps {
  filters: RefundZeroUiFilters
  onChange: (patch: Partial<RefundZeroUiFilters>) => void
  onReset: () => void
  onRefresh: () => void
  meta: RefundZeroMeta | null
  loading: boolean
  calculatedAt: string | null
  now: number
}

function DaySelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: ReturnType<typeof dayOptions>
  onChange: (value: string) => void
}) {
  const stale = value && !options.some((o) => o.value === value)
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">Qualsiasi</option>
        {stale && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function RefundZeroFilterBar({
  filters,
  onChange,
  onReset,
  onRefresh,
  meta,
  loading,
  calculatedAt,
  now,
}: RefundZeroFilterBarProps) {
  const days = dayOptions(now)
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24 space-y-1">
          <Label htmlFor="rz-stake" className="text-[11px] text-muted-foreground">
            Puntata €
          </Label>
          <Input
            id="rz-stake"
            inputMode="decimal"
            value={filters.stake}
            onChange={(e) => onChange({ stake: e.target.value })}
            className="h-8 text-right tabular-nums"
            aria-label="Puntata a bet365 in euro"
          />
        </div>
        <div className="w-28 space-y-1">
          <Label htmlFor="rz-commission" className="text-[11px] text-muted-foreground">
            Commissione %
          </Label>
          <Input
            id="rz-commission"
            inputMode="decimal"
            value={filters.commissionPct}
            onChange={(e) => onChange({ commissionPct: e.target.value })}
            className="h-8 text-right tabular-nums"
            aria-label="Commissione dell'exchange in percento"
            title="La commissione dell'exchange sulle vincite nette, in percento"
          />
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="rz-search" className="text-[11px] text-muted-foreground">
            Cerca
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="rz-search"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Squadra o competizione"
              className="h-8 pl-7"
            />
          </div>
        </div>
        <DaySelect
          id="rz-from"
          label="Dal giorno"
          value={filters.startFrom}
          options={days}
          onChange={(startFrom) => onChange({ startFrom })}
        />
        <DaySelect
          id="rz-to"
          label="Al giorno"
          value={filters.startTo}
          options={days}
          onChange={(startTo) => onChange({ startTo })}
        />
        <div className="space-y-1">
          <Label htmlFor="rz-market" className="text-[11px] text-muted-foreground">
            Mercato
          </Label>
          <select
            id="rz-market"
            value={filters.market}
            onChange={(e) =>
              onChange({
                market:
                  e.target.value === 'result_btts' || e.target.value === 'correct_score'
                    ? e.target.value
                    : '',
              })
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Tutti</option>
            {(
              meta?.markets ?? [
                { key: 'result_btts', label: 'Risultato + Goal', results: 0 },
                { key: 'correct_score', label: 'Risultato esatto', results: 0 },
              ]
            ).map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
                {meta ? ` (${m.results})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rz-sort" className="text-[11px] text-muted-foreground">
            Ordina per
          </Label>
          <select
            id="rz-sort"
            value={filters.sortBy}
            onChange={(e) =>
              onChange({ sortBy: e.target.value === 'start_time' ? 'start_time' : 'profit' })
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="profit">Profitto (decrescente)</option>
            <option value="start_time">Calcio d&apos;inizio</option>
          </select>
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.onlyPositive}
            onChange={(e) => onChange({ onlyPositive: e.target.checked })}
            className="h-4 w-4 rounded border-input"
          />
          Solo in profitto
        </label>
        <div className="ml-auto flex items-center gap-2">
          {calculatedAt && (
            <span
              className="text-[11px] text-muted-foreground"
              title={`Quote lette alle ${formatClock(calculatedAt)}`}
            >
              {meta ? `${meta.totalResults} partite` : ''} · aggiornato{' '}
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

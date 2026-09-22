'use client'

import { RefreshCw, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { MatcherCompetitionFilter } from '@/components/strumenti/matcher-competition-filter'
import { BookmakerBadge } from '@/components/strumenti/scanner-v2/bookmaker-badge'
import { shortBookmakerName } from '@/lib/bookmakers'
import { ageLabel, ageSeconds, formatClock } from '@/lib/matcher/format'
import { TOOL_MARKETS, TOOL_MARKET_LIST, isToolMarketKey, outcomeLabel } from '@/lib/result-btts'
import { sanitizeDecimal } from '@/lib/utils'
import type { ResultBttsMeta, ResultBttsOutcomeKey, ToolMarketKey } from '@/types/result-btts'

/** The value of the exclusion select that compares every outcome. */
export const EXCLUDE_NONE = 'none'

/** The filters of «Risultato + Goal»: every field but the three shared amounts is a query parameter of GET /tools/result-btts. */
export interface ResultBttsUiFilters {
  /** The market compared (§14.173). */
  market: ToolMarketKey
  /** The outcome left out of the rating: an outcome key of the market, or `none`. */
  exclude: ResultBttsOutcomeKey | typeof EXCLUDE_NONE
  search: string
  competitionIds: string[]
  bookmakers: string[]
  minRating: string
  startFrom: string
  startTo: string
  sortBy: 'rating' | 'start_time'
  /** Shared with every calculator of the page: stake, bonus and rimborso in euro. */
  stake: string
  bonus: string
  rimborso: string
}

export const EMPTY_RESULT_BTTS_FILTERS: ResultBttsUiFilters = {
  market: 'result_btts',
  exclude: TOOL_MARKETS.result_btts.defaultExcluded,
  search: '',
  competitionIds: [],
  bookmakers: [],
  minRating: '',
  startFrom: '',
  startTo: '',
  sortBy: 'rating',
  stake: '',
  bonus: '',
  rimborso: '',
}

/** The fields that do not change the query: editing them keeps the page. */
export const RESULT_BTTS_SHARED_KEYS: ReadonlySet<keyof ResultBttsUiFilters> = new Set([
  'stake',
  'bonus',
  'rimborso',
])

/** The excluded outcome the filters ask for, as the API and the rows carry it. */
export function excludedOf(
  filters: Pick<ResultBttsUiFilters, 'exclude'>,
): ResultBttsOutcomeKey | null {
  return filters.exclude === EXCLUDE_NONE ? null : filters.exclude
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

function AmountField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="w-24 space-y-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
        className="h-8"
      />
    </div>
  )
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
  const bookOptions = (meta?.bookmakers ?? []).map((b) => ({
    id: b.slug,
    name: shortBookmakerName(b.name),
  }))
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  const market = TOOL_MARKETS[filters.market]

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="rb-market" className="text-[11px] text-muted-foreground">
            Mercato
          </Label>
          <select
            id="rb-market"
            value={filters.market}
            onChange={(e) => {
              const next = e.target.value
              if (!isToolMarketKey(next)) return
              // A new market gets its own default exclusion: an explicit reset, never a guess.
              onChange({ market: next, exclude: TOOL_MARKETS[next].defaultExcluded })
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {TOOL_MARKET_LIST.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rb-exclude" className="text-[11px] text-muted-foreground">
            Esito escluso
          </Label>
          <select
            id="rb-exclude"
            value={filters.exclude}
            onChange={(e) => {
              const next = e.target.value
              if (next === EXCLUDE_NONE) onChange({ exclude: EXCLUDE_NONE })
              else if ((market.outcomes as readonly string[]).includes(next))
                onChange({ exclude: next as ResultBttsOutcomeKey })
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            title="L'esito lasciato fuori dal confronto: il rating è il dutch sugli altri"
          >
            {market.outcomes.map((key) => (
              <option key={key} value={key}>
                {outcomeLabel(market.key, key)}
                {key === market.defaultExcluded ? ' (predefinito)' : ''}
              </option>
            ))}
            <option value={EXCLUDE_NONE}>Nessuno (tutti gli esiti)</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
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
        <MatcherCompetitionFilter
          competitions={meta?.competitions}
          scope={{}}
          selectedIds={filters.competitionIds}
          onToggle={(id) => onChange({ competitionIds: toggle(filters.competitionIds, id) })}
          className="min-w-[220px]"
        />
        <SearchableMultiSelect
          label="Bookmaker"
          options={bookOptions}
          selectedIds={filters.bookmakers}
          onToggle={(id) => onChange({ bookmakers: toggle(filters.bookmakers, id) })}
          buttonLabel="Bookmaker"
          placeholder="Tutti i bookmaker"
          searchPlaceholder="Cerca bookmaker"
          showBadges
          size="sm"
          className="min-w-[200px]"
          renderOption={(o) => (
            <span className="flex items-center gap-2">
              <BookmakerBadge slug={o.id} name={o.name} />
              <span>{o.name}</span>
            </span>
          )}
        />
        <div className="w-24 space-y-1">
          <Label htmlFor="rb-min-rating" className="text-[11px] text-muted-foreground">
            Rating min %
          </Label>
          <Input
            id="rb-min-rating"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={filters.minRating}
            onChange={(e) => onChange({ minRating: sanitizeDecimal(e.target.value) })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rb-from" className="text-[11px] text-muted-foreground">
            Dal
          </Label>
          <Input
            id="rb-from"
            type="datetime-local"
            value={filters.startFrom}
            onChange={(e) => onChange({ startFrom: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rb-to" className="text-[11px] text-muted-foreground">
            Al
          </Label>
          <Input
            id="rb-to"
            type="datetime-local"
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
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <AmountField
            id="rb-stake"
            label="Puntata €"
            value={filters.stake}
            onChange={(v) => onChange({ stake: v })}
          />
          <AmountField
            id="rb-bonus"
            label="Bonus €"
            value={filters.bonus}
            onChange={(v) => onChange({ bonus: v })}
          />
          <AmountField
            id="rb-rimborso"
            label="Rimborso €"
            value={filters.rimborso}
            onChange={(v) => onChange({ rimborso: v })}
          />
        </div>
        <div className="flex items-center gap-2">
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

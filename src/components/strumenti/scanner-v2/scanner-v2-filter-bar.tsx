'use client'

import { RefreshCw, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import {
  MatcherCompetitionFilter,
  pruneCompetitionIds,
} from '@/components/strumenti/matcher-competition-filter'
import { BookmakerBadge } from './bookmaker-badge'
import { shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { MATCH_TYPE_OPTIONS, marketLabel } from '@/lib/matcher/format'
import type { MatchType, MatcherBookmaker, MatcherMeta } from '@/types/matcher'
import { cn } from '@/lib/utils'

/**
 * Filters of the scanner v2. Every field but the three shared amounts is a
 * server-side filter of GET /matcher/results (§14.95): the page is paginated
 * on the server, nothing is filtered in the browser.
 */
export interface ScannerV2Filters {
  search: string
  /** Shared with every calculator of the page: stake, bonus and rimborso in euro. */
  stake: string
  bonus: string
  rimborso: string
  matchType: MatchType | ''
  sport: string
  nation: string
  competitionIds: string[]
  marketType: string
  /** Bookmaker slugs: none selected = every one of that kind allowed. */
  books: string[]
  exchanges: string[]
  minRating: string
  maxRating: string
  minOdds: string
  maxOdds: string
  startFrom: string
  startTo: string
}

export const EMPTY_FILTERS: ScannerV2Filters = {
  search: '',
  stake: '',
  bonus: '',
  rimborso: '',
  matchType: '',
  sport: '',
  nation: '',
  competitionIds: [],
  marketType: '',
  books: [],
  exchanges: [],
  minRating: '',
  maxRating: '',
  minOdds: '',
  maxOdds: '',
  startFrom: '',
  startTo: '',
}

/** The fields that do not change the query: editing them keeps the page. */
export const SHARED_AMOUNT_KEYS: ReadonlySet<keyof ScannerV2Filters> = new Set([
  'stake',
  'bonus',
  'rimborso',
])

/** Groups of the advanced panel that are active (the badge on the «Filtri» button). */
export function countActiveFilters(f: ScannerV2Filters): number {
  return [
    f.matchType !== '',
    f.sport !== '',
    f.nation !== '',
    f.competitionIds.length > 0,
    f.marketType !== '',
    f.books.length > 0,
    f.exchanges.length > 0,
    f.minRating.trim() !== '' || f.maxRating.trim() !== '',
    f.minOdds.trim() !== '' || f.maxOdds.trim() !== '',
    f.startFrom.trim() !== '' || f.startTo.trim() !== '',
  ].filter(Boolean).length
}

interface ScannerV2FilterBarProps {
  filters: ScannerV2Filters
  onChange: (patch: Partial<ScannerV2Filters>) => void
  onReset: () => void
  /** «Refresh quote»: reloads the results with the filters applied right now. */
  onRefresh: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: MatcherMeta | null
  books: MatcherBookmaker[]
  exchanges: MatcherBookmaker[]
  loading: boolean
  multiplaOpen: boolean
  onMultiplaOpenChange: (open: boolean) => void
  /** Chosen events and the target count, for the badge on the button. */
  multiplaSelected: number
  multiplaTarget: number
}

const LABEL_CLASS = 'text-[11px] uppercase tracking-wider text-muted-foreground'
const SELECT_CLASS =
  'h-8 w-full min-w-0 rounded-lg border border-border bg-surface-1 px-2 text-sm text-foreground'
const noExponent = (e: React.KeyboardEvent<HTMLInputElement>) =>
  ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-foreground"
        aria-label="Togli filtro"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}

function AmountField({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="€"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={noExponent}
        className="h-8 w-20 text-sm"
        aria-label={ariaLabel}
      />
    </div>
  )
}

export function ScannerV2FilterBar({
  filters,
  onChange,
  onReset,
  onRefresh,
  open,
  onOpenChange,
  meta,
  books,
  exchanges,
  loading,
  multiplaOpen,
  onMultiplaOpenChange,
  multiplaSelected,
  multiplaTarget,
}: ScannerV2FilterBarProps) {
  const activeCount = countActiveFilters(filters)
  const bookName = (slug: string, list: MatcherBookmaker[]) =>
    shortBookmakerName(list.find((b) => b.slug === slug)?.name ?? slug)
  const namesOf = (slugs: string[], list: MatcherBookmaker[]) =>
    slugs.map((s) => bookName(s, list)).join(', ')
  const toggleIn = (key: 'books' | 'exchanges', slug: string) => {
    const current = filters[key]
    onChange({
      [key]: current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    })
  }
  const multiLabel = (
    selected: string[],
    list: MatcherBookmaker[],
    singular: string,
    plural: string,
  ) =>
    selected.length === 0
      ? 'Tutti'
      : selected.length === 1
        ? bookName(selected[0], list)
        : `${selected.length} ${plural}`.replace(plural, selected.length === 1 ? singular : plural)

  return (
    <div className="space-y-0">
      {/* Main bar */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca evento o competizione…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="h-8 border-0 bg-transparent pl-8 text-sm focus-visible:ring-0"
            aria-label="Cerca per evento o competizione"
          />
        </div>

        <div className="hidden h-5 w-px bg-border sm:block" />

        <AmountField
          label="Puntata"
          value={filters.stake}
          onChange={(v) => onChange({ stake: v })}
          ariaLabel="Puntata condivisa"
        />
        <AmountField
          label="Bonus"
          value={filters.bonus}
          onChange={(v) => onChange({ bonus: v })}
          ariaLabel="Bonus condiviso"
        />
        <AmountField
          label="Rimborso"
          value={filters.rimborso}
          onChange={(v) => onChange({ rimborso: v })}
          ariaLabel="Rimborso condiviso"
        />

        <div className="hidden h-5 w-px bg-border sm:block" />

        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all',
            open
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtri
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onMultiplaOpenChange(!multiplaOpen)}
          aria-expanded={multiplaOpen}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all',
            multiplaOpen
              ? 'border-neon-lavender/30 bg-neon-lavender/10 text-neon-lavender'
              : 'border-border text-muted-foreground hover:border-neon-lavender/20 hover:text-foreground',
          )}
        >
          Multipla
          {multiplaSelected > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-lavender px-1 text-[10px] font-bold text-background">
              {multiplaSelected}/{multiplaTarget}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Reset filtri"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-busy={loading}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/20 hover:text-foreground disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh quote
        </button>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && !open && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-2">
          {filters.matchType && (
            <Chip onRemove={() => onChange({ matchType: '' })}>
              Tipo: {MATCH_TYPE_OPTIONS.find((o) => o.value === filters.matchType)?.label}
            </Chip>
          )}
          {filters.sport && (
            <Chip onRemove={() => onChange({ sport: '', competitionIds: [] })}>
              Sport: {sportDisplay(filters.sport).label}
            </Chip>
          )}
          {filters.nation && (
            <Chip onRemove={() => onChange({ nation: '', competitionIds: [] })}>
              Nazione: {filters.nation}
            </Chip>
          )}
          {filters.competitionIds.length > 0 && (
            <Chip onRemove={() => onChange({ competitionIds: [] })}>
              Competizioni: {filters.competitionIds.length}
            </Chip>
          )}
          {filters.marketType && (
            <Chip onRemove={() => onChange({ marketType: '' })}>
              Mercato: {marketLabel(filters.marketType, null)}
            </Chip>
          )}
          {filters.books.length > 0 && (
            <Chip onRemove={() => onChange({ books: [] })}>
              Book: {namesOf(filters.books, books)}
            </Chip>
          )}
          {filters.exchanges.length > 0 && (
            <Chip onRemove={() => onChange({ exchanges: [] })}>
              Exchange: {namesOf(filters.exchanges, exchanges)}
            </Chip>
          )}
          {(filters.minRating.trim() || filters.maxRating.trim()) && (
            <Chip onRemove={() => onChange({ minRating: '', maxRating: '' })}>
              Rating: {filters.minRating || '—'} – {filters.maxRating || '—'} %
            </Chip>
          )}
          {(filters.minOdds.trim() || filters.maxOdds.trim()) && (
            <Chip onRemove={() => onChange({ minOdds: '', maxOdds: '' })}>
              Quota: {filters.minOdds || '—'} – {filters.maxOdds || '—'}
            </Chip>
          )}
          {(filters.startFrom.trim() || filters.startTo.trim()) && (
            <Chip onRemove={() => onChange({ startFrom: '', startTo: '' })}>
              Date: {filters.startFrom ? filters.startFrom.replace('T', ' ') : '—'} →{' '}
              {filters.startTo ? filters.startTo.replace('T', ' ') : '—'}
            </Chip>
          )}
        </div>
      )}

      {/* Advanced filters panel */}
      {open && (
        <div className="mt-2 animate-fade-in rounded-xl border border-border bg-surface-1 p-4">
          <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Tipo</Label>
              <select
                className={SELECT_CLASS}
                value={filters.matchType}
                onChange={(e) => onChange({ matchType: e.target.value as MatchType | '' })}
              >
                {MATCH_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Sport</Label>
              <select
                className={SELECT_CLASS}
                value={filters.sport}
                onChange={(e) => {
                  const sport = e.target.value
                  onChange({
                    sport,
                    competitionIds: pruneCompetitionIds(
                      filters.competitionIds,
                      meta?.competitions,
                      {
                        sport,
                        nation: filters.nation,
                      },
                    ),
                  })
                }}
              >
                <option value="">Tutti gli sport</option>
                {meta?.sports.map((s) => {
                  const d = sportDisplay(s)
                  return (
                    <option key={s} value={s}>
                      {d.icon ? `${d.icon} ${d.label}` : d.label}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Nazione</Label>
              <select
                className={SELECT_CLASS}
                value={filters.nation}
                onChange={(e) => {
                  const nation = e.target.value
                  onChange({
                    nation,
                    competitionIds: pruneCompetitionIds(
                      filters.competitionIds,
                      meta?.competitions,
                      {
                        sport: filters.sport,
                        nation,
                      },
                    ),
                  })
                }}
              >
                <option value="">Tutte le nazioni</option>
                {meta?.nations?.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <Label className={LABEL_CLASS}>Competizioni</Label>
              <MatcherCompetitionFilter
                competitions={meta?.competitions}
                scope={{ sport: filters.sport, nation: filters.nation }}
                selectedIds={filters.competitionIds}
                onToggle={(id) =>
                  onChange({
                    competitionIds: filters.competitionIds.includes(id)
                      ? filters.competitionIds.filter((x) => x !== id)
                      : [...filters.competitionIds, id],
                  })
                }
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Mercato</Label>
              <select
                className={SELECT_CLASS}
                value={filters.marketType}
                onChange={(e) => onChange({ marketType: e.target.value })}
              >
                <option value="">Tutti i mercati</option>
                {meta?.marketTypes.map((m) => (
                  <option key={m} value={m}>
                    {marketLabel(m, null)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Book</Label>
              <SearchableMultiSelect
                options={books.map((b) => ({ id: b.slug, name: shortBookmakerName(b.name) }))}
                selectedIds={filters.books}
                onToggle={(slug) => toggleIn('books', slug)}
                buttonLabel={multiLabel(filters.books, books, 'book', 'book')}
                searchPlaceholder="Cerca book…"
                searchInputAriaLabel="Filtra book"
                emptyMessage="Nessun book"
                size="sm"
                className="w-full"
                renderOption={(opt) => <BookmakerBadge slug={opt.id} name={opt.name} />}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Exchange</Label>
              <SearchableMultiSelect
                options={exchanges.map((b) => ({ id: b.slug, name: shortBookmakerName(b.name) }))}
                selectedIds={filters.exchanges}
                onToggle={(slug) => toggleIn('exchanges', slug)}
                buttonLabel={multiLabel(filters.exchanges, exchanges, 'exchange', 'exchange')}
                searchPlaceholder="Cerca exchange…"
                searchInputAriaLabel="Filtra exchange"
                emptyMessage="Nessun exchange nel deposito"
                size="sm"
                className="w-full"
                renderOption={(opt) => <BookmakerBadge slug={opt.id} name={opt.name} />}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Rating min %</Label>
              <Input
                type="number"
                placeholder="es. 98"
                value={filters.minRating}
                onChange={(e) => onChange({ minRating: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 text-sm"
                min={0}
                step={0.5}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Rating max %</Label>
              <Input
                type="number"
                placeholder="—"
                value={filters.maxRating}
                onChange={(e) => onChange({ maxRating: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 text-sm"
                min={0}
                step={0.5}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS} title="Quota della gamba su cui va la puntata">
                Quota min
              </Label>
              <Input
                type="number"
                placeholder="es. 1.50"
                value={filters.minOdds}
                onChange={(e) => onChange({ minOdds: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS} title="Quota della gamba su cui va la puntata">
                Quota max
              </Label>
              <Input
                type="number"
                placeholder="—"
                value={filters.maxOdds}
                onChange={(e) => onChange({ maxOdds: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Dal</Label>
              <Input
                type="datetime-local"
                value={filters.startFrom}
                onChange={(e) => onChange({ startFrom: e.target.value })}
                className="h-8 w-full min-w-0 text-sm"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Al</Label>
              <Input
                type="datetime-local"
                value={filters.startTo}
                onChange={(e) => onChange({ startTo: e.target.value })}
                className="h-8 w-full min-w-0 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

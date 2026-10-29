'use client'

import { Filter, ListChecks, RefreshCw, Search, X } from 'lucide-react'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { CalcNumberField, CalcSelect, CalcTextField } from '@/components/calculators/calc-ds'
import {
  competitionLabel,
  pruneCompetitionIds,
} from '@/components/strumenti/matcher-competition-filter'
import { OmBookLogo, OmDropdown, OmSportIcon, type OmOption } from './om-ds'
import { shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { MATCH_TYPE_OPTIONS, ageLabel, ageSeconds, marketLabel } from '@/lib/matcher/format'
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
  /** «Ordina per» (§14.272): rating from the highest, or kickoff from the nearest. */
  sort: 'rating' | 'start_time'
  matchType: MatchType | ''
  sport: string
  nation: string
  competitionIds: string[]
  marketType: string
  /** The books the stake goes on (slugs): at least one leg of the row on one of them; none = any. */
  books: string[]
  /** The books the OTHER legs may sit on (§14.102); none = any book. */
  coverBooks: string[]
  /** The exchanges the other legs may sit on; none = any exchange. */
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
  sort: 'rating',
  matchType: '',
  sport: '',
  nation: '',
  competitionIds: [],
  marketType: '',
  books: [],
  coverBooks: [],
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

/** Groups of the advanced panel that are active (the count on the «Filtri» button). */
export function countActiveFilters(f: ScannerV2Filters): number {
  return [
    f.matchType !== '',
    f.sport !== '',
    f.nation !== '',
    f.competitionIds.length > 0,
    f.marketType !== '',
    f.books.length > 0,
    f.coverBooks.length > 0,
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
  /** «Aggiorna»: reloads the results with the filters applied right now. */
  onRefresh: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: MatcherMeta | null
  books: MatcherBookmaker[]
  exchanges: MatcherBookmaker[]
  loading: boolean
  /** Clock of the page, for «Quote aggiornate … fa». */
  now: number
  multiplaOpen: boolean
  onMultiplaOpenChange: (open: boolean) => void
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating' },
  { value: 'start_time', label: 'Data e ora' },
]

function bookOptions(list: MatcherBookmaker[]): OmOption[] {
  return list.map((b) => ({
    value: b.slug,
    label: shortBookmakerName(b.name),
    render: <OmBookLogo slug={b.slug} name={b.name} />,
  }))
}

/** A group of the advanced panel: the label on the left, the fields in a grid of four. */
function PanelGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:gap-6">
      <span className="ds-label uppercase text-ds-ink-muted md:pt-[26px]">{title}</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  )
}

/**
 * The bar of the Oddsmatcher from the design (§14.272): a card with search, the two bookmaker
 * menus, the shared stake and the sort; under it Filtri, Multipla, Azzera and the age of the
 * prices with «Aggiorna»; the advanced panel (Evento, Scommessa) and the active filters.
 */
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
  now,
  multiplaOpen,
  onMultiplaOpenChange,
}: ScannerV2FilterBarProps) {
  const activeCount = countActiveFilters(filters)
  // Until the meta answers the lists are empty: the panel says so instead of «Nessun risultato»
  // (the meta took ~30 s in production before §14.306, the user read it as a broken search).
  const loadingText = meta ? undefined : 'Elenco in caricamento…'
  const bookName = (slug: string, list: MatcherBookmaker[]) =>
    shortBookmakerName(list.find((b) => b.slug === slug)?.name ?? slug)
  const namesOf = (slugs: string[], list: MatcherBookmaker[]) =>
    slugs.map((s) => bookName(s, list)).join(', ')

  const scope = { sport: filters.sport, nation: filters.nation }
  const competitionsInScope = (meta?.competitions ?? []).filter(
    (c) =>
      (!scope.sport || c.sportName === scope.sport) &&
      (!scope.nation || c.nationName === scope.nation),
  )
  const withSport = new Set(competitionsInScope.map((c) => c.sportName)).size > 1
  const competitionOpts: OmOption[] = competitionsInScope.map((c) => ({
    value: c.id,
    label: competitionLabel(c, withSport),
    count: c.results,
  }))
  const competitionNames = new Map(
    (meta?.competitions ?? []).map((c) => [c.id, competitionLabel(c, false)]),
  )

  const sportOpts: OmOption[] = (meta?.sports ?? []).map((s) => ({
    value: s,
    label: sportDisplay(s).label,
    icon: <OmSportIcon sport={s} size={18} />,
  }))
  const nationOpts: OmOption[] = (meta?.nations ?? []).map((n) => ({ value: n, label: n }))
  const marketOpts: OmOption[] = (meta?.marketTypes ?? []).map((m) => ({
    value: m,
    label: marketLabel(m, null),
  }))
  const typeOpts: OmOption[] = MATCH_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => ({
    value: o.value,
    label: o.label,
  }))

  const age = meta?.calculatedAt != null ? ageLabel(ageSeconds(meta.calculatedAt, now)) : null

  const chips: { key: string; label: string; clear: () => void }[] = []
  if (filters.matchType)
    chips.push({
      key: 'tipo',
      label: `Tipo: ${MATCH_TYPE_OPTIONS.find((o) => o.value === filters.matchType)?.label}`,
      clear: () => onChange({ matchType: '' }),
    })
  if (filters.sport)
    chips.push({
      key: 'sport',
      label: `Sport: ${sportDisplay(filters.sport).label}`,
      clear: () => onChange({ sport: '', competitionIds: [] }),
    })
  if (filters.nation)
    chips.push({
      key: 'nazione',
      label: `Nazione: ${filters.nation}`,
      clear: () => onChange({ nation: '', competitionIds: [] }),
    })
  if (filters.competitionIds.length > 0)
    chips.push({
      key: 'competizioni',
      label: `Competizione: ${filters.competitionIds.map((id) => competitionNames.get(id) ?? id).join(', ')}`,
      clear: () => onChange({ competitionIds: [] }),
    })
  if (filters.marketType)
    chips.push({
      key: 'mercato',
      label: `Mercato: ${marketLabel(filters.marketType, null)}`,
      clear: () => onChange({ marketType: '' }),
    })
  if (filters.books.length > 0)
    chips.push({
      key: 'book',
      label: `Bookmaker: ${namesOf(filters.books, books)}`,
      clear: () => onChange({ books: [] }),
    })
  if (filters.coverBooks.length > 0)
    chips.push({
      key: 'copertura',
      label: `Copertura: ${namesOf(filters.coverBooks, books)}`,
      clear: () => onChange({ coverBooks: [] }),
    })
  if (filters.exchanges.length > 0)
    chips.push({
      key: 'exchange',
      label: `Exchange: ${namesOf(filters.exchanges, exchanges)}`,
      clear: () => onChange({ exchanges: [] }),
    })
  if (filters.minRating.trim() || filters.maxRating.trim())
    chips.push({
      key: 'rating',
      label: `Rating: ${filters.minRating || '—'} – ${filters.maxRating || '—'} %`,
      clear: () => onChange({ minRating: '', maxRating: '' }),
    })
  if (filters.minOdds.trim() || filters.maxOdds.trim())
    chips.push({
      key: 'quota',
      label: `Quota: ${filters.minOdds || '—'} – ${filters.maxOdds || '—'}`,
      clear: () => onChange({ minOdds: '', maxOdds: '' }),
    })
  if (filters.startFrom.trim() || filters.startTo.trim())
    chips.push({
      key: 'date',
      label: `Date: ${filters.startFrom ? filters.startFrom.replace('T', ' ') : '—'} → ${
        filters.startTo ? filters.startTo.replace('T', ' ') : '—'
      }`,
      clear: () => onChange({ startFrom: '', startTo: '' }),
    })
  const hasAnyFilter = activeCount > 0 || filters.search.trim() !== ''

  return (
    <div className="flex flex-col gap-4">
      {/* Barra principale */}
      <div className="grid grid-cols-2 items-end gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 py-4 shadow-ds-sm sm:grid-cols-2 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_120px_150px]">
        <div className="col-span-2 flex min-w-0 flex-col gap-1.5 lg:col-span-1">
          <label htmlFor="om-search" className="text-sm font-semibold leading-5 text-ds-ink">
            Cerca
          </label>
          <div className="flex h-10 items-center gap-2 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-2.5 transition-[border-color,box-shadow] duration-150 focus-within:border-ds-brand focus-within:shadow-ds-focus">
            <Search className="h-4 w-4 flex-none text-ds-ink-muted" aria-hidden />
            <input
              id="om-search"
              type="search"
              placeholder="Evento o competizione"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="ds-body h-full min-w-0 flex-1 border-0 bg-transparent text-ds-ink outline-none placeholder:text-ds-ink-faint"
            />
          </div>
        </div>
        <OmDropdown
          id="om-books"
          label="Bookmaker principale"
          allLabel="Tutti i bookmaker"
          options={bookOptions(books)}
          selected={filters.books}
          onChange={(next) => onChange({ books: next })}
          panelWidth={220}
          emptyText={loadingText}
          className="col-span-2 sm:col-span-1"
        />
        <OmDropdown
          id="om-cover"
          label="Bookmaker di copertura"
          allLabel="Tutti i bookmaker"
          options={bookOptions(books)}
          selected={filters.coverBooks}
          onChange={(next) => onChange({ coverBooks: next })}
          panelWidth={220}
          emptyText={loadingText}
          className="col-span-2 sm:col-span-1"
        />
        <CalcNumberField
          id="om-stake"
          label="Puntata"
          suffix="€"
          placeholder="0,00"
          value={filters.stake}
          onChange={(v) => onChange({ stake: v })}
        />
        <CalcSelect
          id="om-sort"
          label="Ordina per"
          size="md"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(v) => onChange({ sort: v === 'start_time' ? 'start_time' : 'rating' })}
        />
      </div>

      {/* Azioni */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            className={dsButtonClass(open ? 'primary' : 'secondary', 'sm')}
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filtri{activeCount > 0 ? ` · ${activeCount}` : ''}
          </button>
          <button
            type="button"
            onClick={() => onMultiplaOpenChange(!multiplaOpen)}
            aria-expanded={multiplaOpen}
            className={dsButtonClass(multiplaOpen ? 'primary' : 'secondary', 'sm')}
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            Multipla
          </button>
          {hasAnyFilter && (
            <button type="button" onClick={onReset} className={dsButtonClass('ghost', 'sm')}>
              <X className="h-4 w-4" aria-hidden />
              Azzera
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {age && <span className="ds-caption text-ds-ink-muted">Quote aggiornate {age} fa</span>}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-busy={loading}
            className={cn(dsButtonClass('ghost', 'sm'), 'disabled:cursor-wait disabled:opacity-70')}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Filtri avanzati */}
      {open && (
        <div className="flex flex-col gap-5 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 py-5 shadow-ds-sm sm:px-6">
          <PanelGroup title="Evento">
            <OmDropdown
              id="om-sport"
              label="Sport"
              allLabel="Tutti gli sport"
              size="sm"
              single
              searchable={sportOpts.length > 6}
              options={sportOpts}
              emptyText={loadingText}
              selected={filters.sport ? [filters.sport] : []}
              onChange={(next) => {
                const sport = next[0] ?? ''
                onChange({
                  sport,
                  competitionIds: pruneCompetitionIds(filters.competitionIds, meta?.competitions, {
                    sport,
                    nation: filters.nation,
                  }),
                })
              }}
            />
            <OmDropdown
              id="om-nation"
              label="Nazione"
              allLabel="Tutte le nazioni"
              size="sm"
              single
              options={nationOpts}
              emptyText={loadingText}
              selected={filters.nation ? [filters.nation] : []}
              onChange={(next) => {
                const nation = next[0] ?? ''
                onChange({
                  nation,
                  competitionIds: pruneCompetitionIds(filters.competitionIds, meta?.competitions, {
                    sport: filters.sport,
                    nation,
                  }),
                })
              }}
            />
            <div className="sm:col-span-2">
              <OmDropdown
                id="om-competitions"
                label="Competizione"
                allLabel={
                  meta && meta.competitions === undefined
                    ? 'Competizioni non disponibili'
                    : competitionOpts.length === 0
                      ? 'Nessuna competizione'
                      : 'Tutte le competizioni'
                }
                size="sm"
                panelWidth={340}
                options={competitionOpts}
                selected={filters.competitionIds}
                onChange={(next) => onChange({ competitionIds: next })}
                emptyText={loadingText ?? 'Nessuna competizione con questo nome o nazione.'}
              />
            </div>
            <CalcTextField
              id="om-from"
              label="Dal"
              type="datetime-local"
              value={filters.startFrom}
              onChange={(v) => onChange({ startFrom: v })}
            />
            <CalcTextField
              id="om-to"
              label="Al"
              type="datetime-local"
              value={filters.startTo}
              onChange={(v) => onChange({ startTo: v })}
            />
          </PanelGroup>
          <div className="h-px bg-ds-line" />
          <PanelGroup title="Scommessa">
            <OmDropdown
              id="om-type"
              label="Tipo"
              allLabel="Tutti i tipi"
              size="sm"
              single
              searchable={false}
              options={typeOpts}
              selected={filters.matchType ? [filters.matchType] : []}
              onChange={(next) => onChange({ matchType: (next[0] as MatchType | undefined) ?? '' })}
            />
            <OmDropdown
              id="om-market"
              label="Mercato"
              allLabel="Tutti i mercati"
              size="sm"
              single
              options={marketOpts}
              selected={filters.marketType ? [filters.marketType] : []}
              onChange={(next) => onChange({ marketType: next[0] ?? '' })}
            />
            <OmDropdown
              id="om-exchange"
              label="Exchange"
              allLabel="Tutti gli exchange"
              size="sm"
              searchable={exchanges.length > 6}
              panelWidth={220}
              options={bookOptions(exchanges)}
              selected={filters.exchanges}
              onChange={(next) => onChange({ exchanges: next })}
              emptyText={loadingText ?? 'Nessun exchange nel deposito'}
            />
            <span className="hidden lg:block" aria-hidden />
            <CalcNumberField
              id="om-min-odds"
              label="Quota minima"
              size="sm"
              placeholder="es. 1,50"
              value={filters.minOdds}
              onChange={(v) => onChange({ minOdds: v })}
            />
            <CalcNumberField
              id="om-max-odds"
              label="Quota massima"
              size="sm"
              placeholder="—"
              value={filters.maxOdds}
              onChange={(v) => onChange({ maxOdds: v })}
            />
            <CalcNumberField
              id="om-min-rating"
              label="Rating minimo"
              size="sm"
              suffix="%"
              placeholder="es. 98"
              value={filters.minRating}
              onChange={(v) => onChange({ minRating: v })}
            />
            <CalcNumberField
              id="om-max-rating"
              label="Rating massimo"
              size="sm"
              suffix="%"
              placeholder="—"
              value={filters.maxRating}
              onChange={(v) => onChange({ maxRating: v })}
            />
          </PanelGroup>
        </div>
      )}

      {/* Filtri attivi */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="ds-label uppercase text-ds-ink-muted">Filtri attivi</span>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              aria-label={`Togli il filtro ${c.label}`}
              className={cn(dsButtonClass('ghost', 'sm'), 'max-w-full')}
            >
              <span className="truncate">{c.label}</span>
              <X className="h-4 w-4 flex-none" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

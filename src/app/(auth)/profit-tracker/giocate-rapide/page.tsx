'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { QuickBetModal } from '@/components/profit-tracker/quick-bet-modal'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { QUICK_METHODS } from '@/lib/profit-tracker/categories'
import type { QuickBet } from '@/types/profit-tracker'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('it-IT')
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const QUICK_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  QUICK_METHODS.map((m) => [m.value, m.label]),
)

function methodLabel(method: string) {
  return QUICK_METHOD_LABELS[method] ?? method.replace('_', ' ')
}

interface Filters {
  dateFrom: string
  dateTo: string
  accountId: string
  quickMethod: string
  tag: string
}

const EMPTY_FILTERS: Filters = { dateFrom: '', dateTo: '', accountId: '', quickMethod: '', tag: '' }

type SortKey = 'data' | 'conto' | 'metodo' | 'tag' | 'movimento'
type SortDir = 'asc' | 'desc'
interface Sort {
  key: SortKey
  dir: SortDir
}

const SORT_LABELS: Record<SortKey, string> = {
  data: 'Data',
  conto: 'Conto',
  metodo: 'Metodo',
  tag: 'Tag',
  movimento: 'Movimento',
}
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  data: 'desc',
  conto: 'asc',
  metodo: 'asc',
  tag: 'asc',
  movimento: 'desc',
}
const DEFAULT_SORT: Sort = { key: 'data', dir: DEFAULT_DIR.data }

function timeOf(value?: string) {
  const t = value ? new Date(value).getTime() : Number.NaN
  return Number.isNaN(t) ? 0 : t
}

/**
 * Più recente prima: data di registrazione, poi orario di inserimento, poi id.
 * È lo stesso criterio dell'ORDER BY del backend, così l'elenco non cambia
 * ordine tra una giocata appena salvata e il ricaricamento della pagina.
 */
function compareNewestFirst(a: QuickBet, b: QuickBet) {
  return (
    timeOf(b.dataRegistrazione) - timeOf(a.dataRegistrazione) ||
    timeOf(b.createdAt) - timeOf(a.createdAt) ||
    b.id.localeCompare(a.id)
  )
}

function sortQuickBets(list: QuickBet[], sort: Sort, accountName: (id: string) => string) {
  const sign = sort.dir === 'asc' ? 1 : -1
  const byText = (get: (b: QuickBet) => string) => (a: QuickBet, b: QuickBet) =>
    get(a).localeCompare(get(b), 'it', { sensitivity: 'base' }) * sign || compareNewestFirst(a, b)
  let cmp: (a: QuickBet, b: QuickBet) => number
  switch (sort.key) {
    case 'conto':
      cmp = byText((b) => accountName(b.accountId))
      break
    case 'metodo':
      cmp = byText((b) => methodLabel(b.quickMethod))
      break
    case 'tag':
      cmp = byText((b) => b.tag ?? '')
      break
    case 'movimento':
      cmp = (a, b) => (a.movimento - b.movimento) * sign || compareNewestFirst(a, b)
      break
    default:
      cmp = (a, b) => -sign * compareNewestFirst(a, b)
  }
  return [...list].sort(cmp)
}

function matchesSearch(bet: QuickBet, words: string[], accountName: (id: string) => string) {
  if (words.length === 0) return true
  const haystack = [
    accountName(bet.accountId),
    methodLabel(bet.quickMethod),
    bet.tag,
    bet.nota,
    bet.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: Sort
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === sortKey
  return (
    <th
      className="px-3 py-2 text-left"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1 whitespace-nowrap font-mono uppercase tracking-[0.02em] hover:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
        title={`Ordina per ${label.toLowerCase()}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span aria-hidden="true" className={active ? '' : 'opacity-40'}>
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

export { GiocateRapidePage as GiocateRapideContent }
export default function GiocateRapidePage() {
  const allQuickBets = useProfitTrackerStore((s) => s.quickBets)
  const isLoadingQuickBets = useProfitTrackerStore((s) => s.isLoadingQuickBets)
  const quickBetsError = useProfitTrackerStore((s) => s.quickBetsError)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchQuickBets = useProfitTrackerStore((s) => s.fetchQuickBets)
  const tags = useProfitTrackerStore((s) => s.tags)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)
  const updateQuickBet = useProfitTrackerStore((s) => s.updateQuickBet)
  const removeQuickBet = useProfitTrackerStore((s) => s.removeQuickBet)
  const [modalOpen, setModalOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchQuickBets()
    void fetchTags()
  }, [fetchAllAccounts, fetchQuickBets, fetchTags])

  const accountNames = useMemo(() => new Map(allAccounts.map((a) => [a.id, a.nome])), [allAccounts])
  const resolveAccountName = (accountId: string) => accountNames.get(accountId) ?? '—'

  const quickBets = useMemo(() => {
    const nameOf = (id: string) => accountNames.get(id) ?? ''
    let list = [...allQuickBets]

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      list = list.filter((b) => new Date(b.dataRegistrazione) >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo + 'T23:59:59')
      list = list.filter((b) => new Date(b.dataRegistrazione) <= to)
    }
    if (filters.accountId) {
      list = list.filter((b) => b.accountId === filters.accountId)
    }
    if (filters.quickMethod) {
      list = list.filter((b) => b.quickMethod === filters.quickMethod)
    }
    if (filters.tag) {
      list = list.filter((b) => (b.tag ?? '') === filters.tag)
    }
    const words = search.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length > 0) {
      list = list.filter((b) => matchesSearch(b, words, nameOf))
    }
    return sortQuickBets(list, sort, nameOf)
  }, [allQuickBets, filters, search, sort, accountNames])

  const isFiltering = search.trim() !== '' || Object.values(filters).some((v) => v !== '')

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: DEFAULT_DIR[key] },
    )

  const emptyMessage = isFiltering
    ? 'Nessuna giocata rapida corrisponde alla ricerca o ai filtri.'
    : 'Nessuna giocata rapida registrata. Usa "Nuova giocata" per aggiungerne una.'

  return (
    <ProfitTrackerPageShell
      sectionTitle="Giocate rapide"
      sectionDescription="Registra e controlla risultati veloci come sessioni casino, slot e giochi rapidi."
      actions={
        <Button type="button" onClick={() => setModalOpen(true)}>
          Nuova giocata
        </Button>
      }
    >
      {quickBetsError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {quickBetsError}
        </p>
      )}

      {/* Search, sort (mobile) and filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            aria-label="Cerca giocate rapide"
            placeholder="Cerca per conto, tag, nota o metodo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full text-sm sm:max-w-xs"
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
          </button>
          <div className="flex items-center gap-1 sm:hidden">
            <label className="sr-only" htmlFor="quick-bets-sort">
              Ordina per
            </label>
            <select
              id="quick-bets-sort"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
              value={sort.key}
              onChange={(e) => {
                const key = e.target.value as SortKey
                setSort({ key, dir: DEFAULT_DIR[key] })
              }}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
              title={sort.dir === 'asc' ? 'Ordine crescente' : 'Ordine decrescente'}
              aria-label={sort.dir === 'asc' ? 'Ordine crescente' : 'Ordine decrescente'}
              onClick={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            >
              {sort.dir === 'asc' ? '▲' : '▼'}
            </button>
          </div>
          {isFiltering && !isLoadingQuickBets && (
            <span className="text-xs text-muted-foreground">
              {quickBets.length} di {allQuickBets.length}
            </span>
          )}
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card/50 p-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Data da</span>
              <input
                type="date"
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Data a</span>
              <input
                type="date"
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </label>
            <div className="space-y-1 text-xs text-muted-foreground">
              <span>Conto</span>
              <SearchableSelect
                size="sm"
                placeholder="Tutti"
                searchPlaceholder="Cerca conto..."
                options={allAccounts.map((a) => ({ value: a.id, label: a.nome }))}
                value={filters.accountId}
                onChange={(v) => setFilters((f) => ({ ...f, accountId: v }))}
                className="min-w-[10rem]"
              />
            </div>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Metodo</span>
              <select
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                value={filters.quickMethod}
                onChange={(e) => setFilters((f) => ({ ...f, quickMethod: e.target.value }))}
              >
                <option value="">Tutti</option>
                {Object.entries(QUICK_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Tag</span>
              <select
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                value={filters.tag}
                onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
              >
                <option value="">Tutti</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.nome}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Resetta
            </button>
          </div>
        )}
      </div>

      <div className="block space-y-4 sm:hidden">
        {isLoadingQuickBets ? (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Caricamento...
          </div>
        ) : quickBets.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            {emptyMessage}
          </div>
        ) : (
          quickBets.map((bet) => {
            const movementClass = bet.movimento >= 0 ? 'text-emerald-400' : 'text-destructive'
            return (
              <div
                key={bet.id}
                className="rounded-xl border border-border bg-card/70 p-4 shadow-sm"
              >
                <div className="space-y-2">
                  <h2 className="text-base font-semibold leading-snug text-foreground">
                    {methodLabel(bet.quickMethod)}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                      title={
                        bet.createdAt ? `Inserita il ${formatDateTime(bet.createdAt)}` : undefined
                      }
                    >
                      {formatDate(bet.dataRegistrazione)}
                    </span>
                    <span className="rounded-md bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      ID {bet.id}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Conto</span>
                    <span className="text-right text-foreground">
                      {resolveAccountName(bet.accountId)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tag</span>
                    <span className="text-right text-muted-foreground">{bet.tag ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Nota</span>
                    <span className="text-right text-muted-foreground">{bet.nota ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border/50 pt-2">
                    <span className="text-muted-foreground">Movimento</span>
                    <span className={`text-right font-medium ${movementClass}`}>
                      {bet.movimento.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      void updateQuickBet(bet.id, {
                        movimento: -bet.movimento,
                      })
                    }
                  >
                    Inverti
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    onClick={() => void removeQuickBet(bet.id)}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
              <th className="px-3 py-2 text-left">ID</th>
              <SortableHeader
                label="Registrato il"
                sortKey="data"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHeader label="Conto" sortKey="conto" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Metodo" sortKey="metodo" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Tag" sortKey="tag" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2 text-left">Note</th>
              <SortableHeader
                label="Movimento"
                sortKey="movimento"
                sort={sort}
                onSort={toggleSort}
              />
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingQuickBets && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={8}>
                  Caricamento...
                </td>
              </tr>
            )}
            {!isLoadingQuickBets &&
              quickBets.map((bet) => (
                <tr
                  key={bet.id}
                  className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent"
                >
                  <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                    {bet.id}
                  </td>
                  <td
                    className="px-3 py-2 align-top text-xs text-muted-foreground"
                    title={
                      bet.createdAt ? `Inserita il ${formatDateTime(bet.createdAt)}` : undefined
                    }
                  >
                    {formatDate(bet.dataRegistrazione)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-foreground">
                    {resolveAccountName(bet.accountId)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {methodLabel(bet.quickMethod)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {bet.tag ?? '—'}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {bet.nota ?? '—'}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 align-top font-mono text-xs font-medium ${
                      bet.movimento >= 0 ? 'text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    {bet.movimento.toFixed(2)} €
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          void updateQuickBet(bet.id, {
                            movimento: -bet.movimento,
                          })
                        }
                      >
                        Inverti
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => void removeQuickBet(bet.id)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!isLoadingQuickBets && quickBets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={8}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <QuickBetModal open={modalOpen} onOpenChange={setModalOpen} />
    </ProfitTrackerPageShell>
  )
}

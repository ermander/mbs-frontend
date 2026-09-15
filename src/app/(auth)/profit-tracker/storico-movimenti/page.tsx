'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import {
  getActivityFeed,
  getActivityFeedSummary,
  updateWalletMovement,
} from '@/services/api/profit-tracker-client'
import { getErrorMessage } from '@/lib/error-utils'
import { NATURA_BADGE_CLASS, direzioneForTipo } from '@/lib/profit-tracker/movement-categories'
import type {
  AccountMovementStato,
  ActivityFeedEntry,
  ActivityFeedSource,
  ActivityFeedSummary,
  MovementCategory,
} from '@/types/profit-tracker'

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const SOURCE_LABELS: Record<ActivityFeedSource, string> = {
  bet_settlement: 'Scommessa',
  quick_bet: 'Giocata rapida',
  deposito: 'Deposito',
  prelievo: 'Prelievo',
  riconciliazione: 'Riconciliazione',
  ricarica: 'Ricarica',
  spesa: 'Spesa',
  trasferimento: 'Trasferimento',
}

const SOURCE_COLORS: Record<ActivityFeedSource, string> = {
  bet_settlement: 'bg-neon-blue/15 text-neon-blue border border-neon-blue/20',
  quick_bet: 'bg-neon-lavender/15 text-neon-lavender border border-neon-lavender/20',
  deposito: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  prelievo: 'bg-destructive/15 text-destructive border border-destructive/20',
  riconciliazione: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  ricarica: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  spesa: 'bg-destructive/15 text-destructive border border-destructive/20',
  trasferimento: 'bg-white/5 text-white/40 border border-white/10',
}

const FILTER_OPTIONS: { value: ActivityFeedSource | ''; label: string }[] = [
  { value: '', label: 'Tutte' },
  { value: 'bet_settlement', label: 'Scommessa' },
  { value: 'quick_bet', label: 'Giocata rapida' },
  { value: 'deposito', label: 'Deposito' },
  { value: 'prelievo', label: 'Prelievo' },
  { value: 'riconciliazione', label: 'Riconciliazione' },
  { value: 'ricarica', label: 'Ricarica' },
  { value: 'spesa', label: 'Spesa' },
  { value: 'trasferimento', label: 'Trasferimento' },
]

// §14.109: stato dei prelievi (gli altri movimenti non ne hanno).
function StatoBadge({ stato }: { stato: AccountMovementStato | null | undefined }) {
  if (!stato) return null
  return stato === 'in_attesa' ? (
    <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      In attesa
    </span>
  ) : (
    <span className="inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/50">
      Pagato
    </span>
  )
}

// §14.111: la categoria di una ricarica/spesa; senza categoria si sceglie in riga e la
// PATCH la salva (valore e saldi non cambiano).
function CategoriaCell({
  entry,
  categories,
  busy,
  onClassify,
}: {
  entry: ActivityFeedEntry
  categories: MovementCategory[]
  busy: boolean
  onClassify: (entry: ActivityFeedEntry, categoryId: string) => void
}) {
  if (entry.source !== 'ricarica' && entry.source !== 'spesa') return null
  if (entry.categoriaNome && entry.natura) {
    return (
      <span
        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${NATURA_BADGE_CLASS[entry.natura]}`}
      >
        {entry.categoriaNome}
      </span>
    )
  }
  const direzione = direzioneForTipo(entry.source)
  const options = categories
    .filter((c) => c.attivo && c.direzione === direzione)
    .sort((a, b) => a.ordine - b.ordine)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
        Da classificare
      </span>
      <select
        aria-label="Classifica il movimento"
        className="h-7 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground disabled:opacity-40"
        value=""
        disabled={busy}
        onChange={(e) => {
          if (e.target.value) onClassify(entry, e.target.value)
        }}
      >
        <option value="">Scegli categoria…</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
    </span>
  )
}

function formatBetDescription(entry: ActivityFeedEntry): string {
  const parts: string[] = []
  if (entry.eventoNome) parts.push(entry.eventoNome)
  if (entry.competizione) parts.push(entry.competizione)
  if (entry.mercato) parts.push(entry.mercato)
  if (entry.metodo) parts.push(`(${entry.metodo})`)
  return parts.join(' · ')
}

export { StoricoMovimentiPage as StoricoMovimentiContent }
export default function StoricoMovimentiPage() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const markAccountMovementPaid = useProfitTrackerStore((s) => s.markAccountMovementPaid)
  const movementCategories = useProfitTrackerStore((s) => s.movementCategories)
  const fetchMovementCategories = useProfitTrackerStore((s) => s.fetchMovementCategories)

  const [items, setItems] = useState<ActivityFeedEntry[]>([])
  const [payingId, setPayingId] = useState<string | null>(null)
  const [classifyingId, setClassifyingId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ActivityFeedSummary | null>(null)
  const limit = 25

  // Filters
  const [sourceFilter, setSourceFilter] = useState<ActivityFeedSource | ''>('')
  const [statoFilter, setStatoFilter] = useState<AccountMovementStato | ''>('')
  const [accountFilter, setAccountFilter] = useState('')
  const [walletFilter, setWalletFilter] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [daClassificareFilter, setDaClassificareFilter] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const resolveAccountName = useCallback(
    (accountId: string | null) => {
      if (!accountId) return '—'
      const account = allAccounts.find((a) => a.id === accountId)
      return account?.nome ?? '—'
    },
    [allAccounts],
  )

  const resolveWalletName = useCallback(
    (walletId: string | null) => {
      if (!walletId) return '—'
      const wallet = wallets.find((w) => w.id === walletId)
      return wallet?.nome ?? '—'
    },
    [wallets],
  )

  const sharedFilters = {
    source: sourceFilter || undefined,
    stato: statoFilter || undefined,
    accountId: accountFilter || undefined,
    walletId: walletFilter || undefined,
    categoria: categoriaFilter || undefined,
    daClassificare: daClassificareFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }

  const loadData = useCallback(
    async (pageNum: number) => {
      setLoading(true)
      try {
        const [feedResult, summaryResult] = await Promise.all([
          getActivityFeed({
            page: pageNum,
            limit,
            ...sharedFilters,
          }),
          getActivityFeedSummary(sharedFilters),
        ])
        setItems(feedResult.items)
        setTotal(feedResult.total)
        setPage(feedResult.page)
        setSummary(summaryResult)
      } catch {
        // Silent fail, empty state shown
      } finally {
        setLoading(false)
      }
    },
    [
      sourceFilter,
      statoFilter,
      accountFilter,
      walletFilter,
      categoriaFilter,
      daClassificareFilter,
      fromDate,
      toDate,
    ],
  )

  // §14.111: classificare in riga una ricarica/spesa senza categoria.
  const handleClassify = async (entry: ActivityFeedEntry, categoryId: string) => {
    setClassifyingId(entry.id)
    try {
      await updateWalletMovement(entry.id, { categoryId })
      toast.success('Movimento classificato')
      await loadData(page)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile classificare il movimento.')
    } finally {
      setClassifyingId(null)
    }
  }

  // §14.109: un prelievo in attesa si segna pagato anche da qui; poi si ricarica la pagina corrente.
  const handlePay = async (entry: ActivityFeedEntry) => {
    setPayingId(entry.id)
    try {
      await markAccountMovementPaid(entry.id)
      toast.success('Prelievo pagato: wallet accreditato')
      await loadData(page)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile segnare il prelievo come pagato.')
    } finally {
      setPayingId(null)
    }
  }

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
    void fetchMovementCategories()
  }, [fetchAllAccounts, fetchWallets, fetchMovementCategories])

  useEffect(() => {
    void loadData(1)
  }, [loadData])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleFilter = () => {
    void loadData(1)
  }

  const resolveReference = (entry: ActivityFeedEntry) => {
    if (entry.accountId) return resolveAccountName(entry.accountId)
    if (entry.walletId) return resolveWalletName(entry.walletId)
    return '—'
  }

  const getDescription = (entry: ActivityFeedEntry): string => {
    if (entry.source === 'bet_settlement' && entry.eventoNome) {
      return formatBetDescription(entry)
    }
    return entry.descrizione ?? '—'
  }

  return (
    <ProfitTrackerPageShell
      sectionTitle="Storico movimenti"
      sectionDescription="Tutte le transazioni finanziarie: scommesse, giocate rapide, depositi, prelievi e altro."
    >
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as ActivityFeedSource | '')}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Stato prelievo</label>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={statoFilter}
            onChange={(e) => setStatoFilter(e.target.value as AccountMovementStato | '')}
          >
            <option value="">Tutti</option>
            <option value="in_attesa">In attesa</option>
            <option value="pagato">Pagato</option>
          </select>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Conto</label>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="">Tutti</option>
            {allAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Wallet</label>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
          >
            <option value="">Tutti</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Categoria</label>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
          >
            <option value="">Tutte</option>
            {movementCategories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-xs font-medium text-muted-foreground sm:self-end">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={daClassificareFilter}
            onChange={(e) => setDaClassificareFilter(e.target.checked)}
          />
          Solo da classificare
        </label>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Da</label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">A</label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm sm:w-auto"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="mt-1 h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:mt-0 sm:w-auto"
          onClick={handleFilter}
        >
          Filtra
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Totale entrate
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-emerald-400">
              {formatCurrency(summary.totaleEntrate)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Totale uscite
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-destructive">
              {formatCurrency(summary.totaleUscite)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo netto
            </p>
            <p
              className={`mt-2 font-mono text-xl font-semibold ${summary.saldoNetto >= 0 ? 'text-emerald-400' : 'text-destructive'}`}
            >
              {formatCurrency(summary.saldoNetto)}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <p className="text-sm text-muted-foreground">Caricamento movimenti...</p>}

      {/* Mobile cards */}
      <div className="block space-y-3 sm:hidden">
        {items.map((entry) => (
          <div
            key={`${entry.source}-${entry.id}`}
            className="rounded-xl border border-border bg-card/70 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[entry.source]}`}
              >
                {SOURCE_LABELS[entry.source]}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.data).toLocaleDateString('it-IT')}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{resolveReference(entry)}</span>
              <span
                className={`text-sm font-semibold ${
                  entry.importo >= 0 ? 'text-emerald-400' : 'text-destructive'
                }`}
              >
                {formatCurrency(entry.importo)}
              </span>
            </div>
            {getDescription(entry) !== '—' && (
              <p className="mt-1 text-xs text-muted-foreground">{getDescription(entry)}</p>
            )}
            {(entry.source === 'ricarica' || entry.source === 'spesa') && (
              <div className="mt-2">
                <CategoriaCell
                  entry={entry}
                  categories={movementCategories}
                  busy={classifyingId === entry.id}
                  onClassify={(e, id) => void handleClassify(e, id)}
                />
              </div>
            )}
            {entry.source === 'prelievo' && (
              <div className="mt-2 flex items-center justify-between">
                <StatoBadge stato={entry.stato} />
                {entry.stato === 'in_attesa' && (
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-40"
                    disabled={payingId === entry.id}
                    onClick={() => void handlePay(entry)}
                  >
                    Segna pagato
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessun movimento trovato.
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Conto / Wallet</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-right">Importo</th>
              <th className="px-3 py-2 text-left">Stato</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr
                key={`${entry.source}-${entry.id}`}
                className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {new Date(entry.data).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[entry.source]}`}
                  >
                    {SOURCE_LABELS[entry.source]}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-foreground">{resolveReference(entry)}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                  {getDescription(entry)}
                </td>
                <td className="px-3 py-2">
                  <CategoriaCell
                    entry={entry}
                    categories={movementCategories}
                    busy={classifyingId === entry.id}
                    onClassify={(e, id) => void handleClassify(e, id)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono">
                  <span
                    className={`text-sm font-medium ${
                      entry.importo >= 0 ? 'text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    {formatCurrency(entry.importo)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {entry.source === 'prelievo' && (
                    <div className="flex items-center gap-2">
                      <StatoBadge stato={entry.stato} />
                      {entry.stato === 'in_attesa' && (
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-40"
                          disabled={payingId === entry.id}
                          onClick={() => void handlePay(entry)}
                        >
                          Segna pagato
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={7}>
                  Nessun movimento trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} di {total} movimenti
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => void loadData(page - 1)}
            >
              Precedente
            </button>
            <span className="flex items-center text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => void loadData(page + 1)}
            >
              Successiva
            </button>
          </div>
        </div>
      )}
    </ProfitTrackerPageShell>
  )
}

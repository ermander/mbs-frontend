'use client'

import { useCallback, useEffect, useState } from 'react'

import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getActivityFeed, getActivityFeedSummary } from '@/services/api/profit-tracker-client'
import type {
  ActivityFeedEntry,
  ActivityFeedSource,
  ActivityFeedSummary,
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
  bet_settlement: 'bg-blue-100 text-blue-700',
  quick_bet: 'bg-violet-100 text-violet-700',
  deposito: 'bg-emerald-100 text-emerald-700',
  prelievo: 'bg-red-100 text-red-700',
  riconciliazione: 'bg-amber-100 text-amber-700',
  ricarica: 'bg-emerald-100 text-emerald-700',
  spesa: 'bg-red-100 text-red-700',
  trasferimento: 'bg-gray-100 text-gray-700',
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

function formatBetDescription(entry: ActivityFeedEntry): string {
  const parts: string[] = []
  if (entry.eventoNome) parts.push(entry.eventoNome)
  if (entry.competizione) parts.push(entry.competizione)
  if (entry.mercato) parts.push(entry.mercato)
  if (entry.metodo) parts.push(`(${entry.metodo})`)
  return parts.join(' · ')
}

export default function StoricoMovimentiPage() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)

  const [items, setItems] = useState<ActivityFeedEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ActivityFeedSummary | null>(null)
  const limit = 25

  // Filters
  const [sourceFilter, setSourceFilter] = useState<ActivityFeedSource | ''>('')
  const [accountFilter, setAccountFilter] = useState('')
  const [walletFilter, setWalletFilter] = useState('')
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
    accountId: accountFilter || undefined,
    walletId: walletFilter || undefined,
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
    [sourceFilter, accountFilter, walletFilter, fromDate, toDate],
  )

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
  }, [fetchAllAccounts, fetchWallets])

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
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Conto</label>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Wallet</label>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Da</label>
          <input
            type="date"
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">A</label>
          <input
            type="date"
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
            <p className="mt-2 text-xl font-semibold text-emerald-600">
              {formatCurrency(summary.totaleEntrate)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Totale uscite
            </p>
            <p className="mt-2 text-xl font-semibold text-red-500">
              {formatCurrency(summary.totaleUscite)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo netto
            </p>
            <p
              className={`mt-2 text-xl font-semibold ${summary.saldoNetto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
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
                  entry.importo >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {formatCurrency(entry.importo)}
              </span>
            </div>
            {getDescription(entry) !== '—' && (
              <p className="mt-1 text-xs text-muted-foreground">{getDescription(entry)}</p>
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
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Conto / Wallet</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-right">Importo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr
                key={`${entry.source}-${entry.id}`}
                className="border-b border-border/40 last:border-b-0"
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
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <span
                    className={`text-sm font-medium ${
                      entry.importo >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {formatCurrency(entry.importo)}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={5}>
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

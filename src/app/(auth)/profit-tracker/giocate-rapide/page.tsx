'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { QuickBetModal } from '@/components/profit-tracker/quick-bet-modal'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { QUICK_METHODS } from '@/lib/profit-tracker/categories'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('it-IT')
}

const QUICK_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  QUICK_METHODS.map((m) => [m.value, m.label]),
)

interface Filters {
  dateFrom: string
  dateTo: string
  accountId: string
  quickMethod: string
  tag: string
}

const EMPTY_FILTERS: Filters = { dateFrom: '', dateTo: '', accountId: '', quickMethod: '', tag: '' }

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

  useEffect(() => {
    void fetchAllAccounts()
    void fetchQuickBets()
    void fetchTags()
  }, [fetchAllAccounts, fetchQuickBets, fetchTags])

  const resolveAccountName = (accountId: string) =>
    allAccounts.find((a) => a.id === accountId)?.nome ?? '—'

  const quickBets = useMemo(() => {
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
    return list
  }, [allQuickBets, filters])

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

      {/* Filter bar */}
      <div className="space-y-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
          onClick={() => setShowFilters((v) => !v)}
        >
          {showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
        </button>
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
            Nessuna giocata rapida registrata. Usa &quot;Nuova giocata&quot; per aggiungerne una.
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
                    {bet.quickMethod.replace('_', ' ')}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
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
                    className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
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
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Registrato il</th>
              <th className="px-3 py-2 text-left">Conto</th>
              <th className="px-3 py-2 text-left">Metodo</th>
              <th className="px-3 py-2 text-left">Tag</th>
              <th className="px-3 py-2 text-left">Note</th>
              <th className="px-3 py-2 text-left">Movimento</th>
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
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {formatDate(bet.dataRegistrazione)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-foreground">
                    {resolveAccountName(bet.accountId)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs capitalize text-muted-foreground">
                    {bet.quickMethod.replace('_', ' ')}
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
                        className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
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
                  Nessuna giocata rapida registrata. Usa &quot;Nuova giocata&quot; per aggiungerne
                  una.
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

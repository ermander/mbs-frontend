'use client'

import { useEffect, useCallback, useMemo, useState } from 'react'

import { Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { AccountCreateModal } from '@/components/profit-tracker/account-create-modal'
import { AccountMovementModal } from '@/components/profit-tracker/account-movement-modal'
import { AccountEditModal } from '@/components/profit-tracker/account-edit-modal'
import { StatusBadge } from '@/components/profit-tracker/status-badge'

const PAGE_SIZE = 20

export default function ContiPage() {
  const accounts = useProfitTrackerStore((s) => s.accounts)
  const accountsTotal = useProfitTrackerStore((s) => s.accountsTotal)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const isLoadingAccounts = useProfitTrackerStore((s) => s.isLoadingAccounts)
  const accountsError = useProfitTrackerStore((s) => s.accountsError)
  const holders = useProfitTrackerStore((s) => s.holders)
  const books = useProfitTrackerStore((s) => s.books)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)
  const fetchAccounts = useProfitTrackerStore((s) => s.fetchAccounts)
  const updateAccount = useProfitTrackerStore((s) => s.updateAccount)

  const [createOpen, setCreateOpen] = useState(false)
  const [movementForAccount, setMovementForAccount] = useState<string | undefined>(undefined)
  const [editingAccountId, setEditingAccountId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [holderId, setHolderId] = useState<string>('')
  const [bookId, setBookId] = useState<string>('')
  const [sortSaldo, setSortSaldo] = useState<'asc' | 'desc'>('desc')

  const loadAccounts = useCallback(() => {
    void fetchAccounts({
      page,
      limit: PAGE_SIZE,
      holderId: holderId || undefined,
      bookId: bookId || undefined,
      sortSaldo,
    })
  }, [fetchAccounts, page, holderId, bookId, sortSaldo])

  useEffect(() => {
    if (!holders.length) void fetchHolders()
    if (!books.length) void fetchBooks({ limit: 5000 })
    void fetchAllAccounts()
  }, [holders.length, books.length, fetchHolders, fetchBooks, fetchAllAccounts])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const saldoTotaleConti = useMemo(
    () => allAccounts.reduce((sum, a) => sum + a.saldoAttuale, 0),
    [allAccounts],
  )
  const saldoTotaleFormatted =
    saldoTotaleConti.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'

  const resolveHolderName = (id: string) => holders.find((h) => h.id === id)?.nome ?? '—'
  const resolveBookName = (id: string) => books.find((b) => b.id === id)?.nome ?? '—'

  const totalPages = accountsTotal != null ? Math.max(1, Math.ceil(accountsTotal / PAGE_SIZE)) : 1
  const showEmptyState = !isLoadingAccounts && !accountsError && accounts.length === 0

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Conti</h1>
          <p className="text-muted-foreground">
            Gestisci i conti collegati ai tuoi bookmaker e tieni traccia dei saldi.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Nuovo conto
        </Button>
      </header>

      <div
        className="flex w-fit items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5"
        role="status"
        aria-label={`Saldo totale conti: ${saldoTotaleFormatted}`}
      >
        <Scale className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground">Saldo attuale</span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {saldoTotaleFormatted}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card/70 p-3 shadow-sm">
        <SearchableSelect
          id="filter-holder"
          label="Intestatario"
          placeholder="Tutti"
          searchPlaceholder="Cerca intestatario..."
          options={holders.map((h) => ({ value: h.id, label: h.nome }))}
          value={holderId}
          onChange={(v) => {
            setHolderId(v)
            setPage(1)
          }}
          className="min-w-[200px]"
        />
        <SearchableSelect
          id="filter-book"
          label="Book"
          placeholder="Tutti"
          searchPlaceholder="Cerca book..."
          options={books.map((b) => ({ value: b.id, label: b.nome }))}
          value={bookId}
          onChange={(v) => {
            setBookId(v)
            setPage(1)
          }}
          className="min-w-[200px]"
        />
      </div>

      {accountsError && (
        <p className="text-sm text-destructive">
          {accountsError || 'Si è verificato un errore durante il caricamento dei conti.'}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Creato il</th>
              <th className="px-3 py-2 text-left">Intestatario</th>
              <th className="px-3 py-2 text-left">Book</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => {
                    setSortSaldo((s) => (s === 'desc' ? 'asc' : 'desc'))
                    setPage(1)
                  }}
                  title={
                    sortSaldo === 'desc'
                      ? 'Ordine: maggiore → minore (clicca per invertire)'
                      : 'Ordine: minore → maggiore (clicca per invertire)'
                  }
                >
                  Saldo attuale
                  <span aria-hidden>{sortSaldo === 'desc' ? '↓' : '↑'}</span>
                </button>
              </th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingAccounts && accounts.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={7}>
                  Caricamento conti in corso...
                </td>
              </tr>
            )}
            {!isLoadingAccounts &&
              accounts.map((account) => (
                <tr key={account.id} className="border-b border-border/40 last:border-b-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(account.createdAt).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {resolveHolderName(account.holderId)}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {resolveBookName(account.bookId)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {account.descrizione ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">
                    {account.saldoAttuale.toFixed(2)} €
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        updateAccount(account.id, {
                          stato: account.stato === 'abilitato' ? 'disabilitato' : 'abilitato',
                        })
                      }
                    >
                      <StatusBadge variant={account.stato === 'abilitato' ? 'enabled' : 'disabled'}>
                        {account.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
                      </StatusBadge>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setMovementForAccount(account.id)}
                      >
                        Nuovo movimento
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setEditingAccountId(account.id)}
                      >
                        Modifica
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {showEmptyState && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={7}>
                  Nessun conto registrato. Usa &quot;Nuovo conto&quot; per crearne uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {accountsTotal != null && accountsTotal > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Pagina {page} di {totalPages} · {accountsTotal} conti in totale
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoadingAccounts}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Precedente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoadingAccounts}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      <AccountCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) loadAccounts()
        }}
      />
      <AccountMovementModal
        open={movementForAccount != null}
        onOpenChange={(open) => {
          if (!open) setMovementForAccount(undefined)
        }}
        defaultAccountId={movementForAccount}
      />
      {editingAccountId && (
        <AccountEditModal
          open={editingAccountId != null}
          onOpenChange={(open) => {
            if (!open) setEditingAccountId(undefined)
          }}
          account={
            accounts.find((a) => a.id === editingAccountId) ??
            allAccounts.find((a) => a.id === editingAccountId)!
          }
        />
      )}
    </section>
  )
}

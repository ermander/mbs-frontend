'use client'

import { useEffect, useCallback, useMemo, useState } from 'react'

import { Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
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
  const [holderIds, setHolderIds] = useState<string[]>([])
  const [bookIds, setBookIds] = useState<string[]>([])
  const [sortSaldo, setSortSaldo] = useState<'asc' | 'desc'>('desc')

  const loadAccounts = useCallback(() => {
    void fetchAccounts({
      page,
      limit: PAGE_SIZE,
      holderIds: holderIds.length > 0 ? holderIds.join(',') : undefined,
      bookIds: bookIds.length > 0 ? bookIds.join(',') : undefined,
      sortSaldo,
    })
  }, [fetchAccounts, page, holderIds, bookIds, sortSaldo])

  useEffect(() => {
    if (!holders.length) void fetchHolders()
    if (!books.length) void fetchBooks({ limit: 5000 })
    void fetchAllAccounts()
  }, [holders.length, books.length, fetchHolders, fetchBooks, fetchAllAccounts])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const saldoTotaleConti = useMemo(() => {
    const hasFilter = holderIds.length > 0 || bookIds.length > 0
    if (!hasFilter) return allAccounts.reduce((sum, a) => sum + a.saldoAttuale, 0)
    return allAccounts
      .filter((a) => {
        if (holderIds.length > 0 && !holderIds.includes(a.holderId)) return false
        if (bookIds.length > 0 && !bookIds.includes(a.bookId)) return false
        return true
      })
      .reduce((sum, a) => sum + a.saldoAttuale, 0)
  }, [allAccounts, holderIds, bookIds])
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
    <ProfitTrackerPageShell
      sectionTitle="Conti"
      sectionDescription="Gestisci i conti collegati ai bookmaker e monitora i saldi disponibili."
      actions={
        <Button type="button" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          Nuovo conto
        </Button>
      }
    >
      <div
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5 sm:w-fit sm:justify-start"
        role="status"
        aria-label={`Saldo totale conti: ${saldoTotaleFormatted}`}
      >
        <Scale className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground">Saldo attuale</span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {saldoTotaleFormatted}
        </span>
      </div>

      <div className="flex flex-col items-stretch gap-4 rounded-xl border border-border bg-card/70 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <SearchableMultiSelect
          label="Intestatario"
          placeholder="Tutti"
          searchPlaceholder="Cerca intestatario..."
          buttonLabel={holderIds.length > 0 ? `${holderIds.length} selezionati` : 'Tutti'}
          options={holders.map((h) => ({ id: h.id, name: h.nome }))}
          selectedIds={holderIds}
          onToggle={(id) => {
            setHolderIds((prev) =>
              prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
            )
            setPage(1)
          }}
          showBadges
          className="w-full sm:min-w-[200px]"
        />
        <SearchableMultiSelect
          label="Book"
          placeholder="Tutti"
          searchPlaceholder="Cerca book..."
          buttonLabel={bookIds.length > 0 ? `${bookIds.length} selezionati` : 'Tutti'}
          options={books.map((b) => ({ id: b.id, name: b.nome }))}
          selectedIds={bookIds}
          onToggle={(id) => {
            setBookIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
            setPage(1)
          }}
          showBadges
          className="w-full sm:min-w-[200px]"
        />
      </div>

      {accountsError && (
        <p className="text-sm text-destructive">
          {accountsError || 'Si è verificato un errore durante il caricamento dei conti.'}
        </p>
      )}

      <div className="block space-y-4 sm:hidden">
        {isLoadingAccounts && accounts.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Caricamento conti in corso...
          </div>
        )}
        {!isLoadingAccounts &&
          accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border border-border bg-card/70 p-4 shadow-sm"
            >
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Creato il</span>
                  <span className="text-foreground">
                    {new Date(account.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Intestatario</span>
                  <span className="text-right text-foreground">
                    {resolveHolderName(account.holderId)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Book</span>
                  <span className="text-right text-foreground">
                    {resolveBookName(account.bookId)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Descrizione</span>
                  <span className="text-right text-muted-foreground">
                    {account.descrizione ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">Saldo attuale</span>
                  <span className="font-medium text-foreground">
                    {account.saldoAttuale.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Stato</span>
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
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setMovementForAccount(account.id)}
                >
                  Nuovo movimento
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setEditingAccountId(account.id)}
                >
                  Modifica
                </button>
              </div>
            </div>
          ))}
        {showEmptyState && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessun conto registrato. Usa &quot;Nuovo conto&quot; per crearne uno.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
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
    </ProfitTrackerPageShell>
  )
}

'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { AccountCreateModal } from '@/components/profit-tracker/account-create-modal'
import { AccountMovementModal } from '@/components/profit-tracker/account-movement-modal'
import { StatusBadge } from '@/components/profit-tracker/status-badge'

export default function ContiPage() {
  const accounts = useProfitTrackerStore((s) => s.accounts)
  const holders = useProfitTrackerStore((s) => s.holders)
  const books = useProfitTrackerStore((s) => s.books)
  const updateAccount = useProfitTrackerStore((s) => s.updateAccount)

  const [createOpen, setCreateOpen] = useState(false)
  const [movementForAccount, setMovementForAccount] = useState<string | undefined>(undefined)

  const resolveHolderName = (holderId: string) =>
    holders.find((h) => h.id === holderId)?.nome ?? '—'

  const resolveBookName = (bookId: string) => books.find((b) => b.id === bookId)?.nome ?? '—'

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

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Creato il</th>
              <th className="px-3 py-2 text-left">Intestatario</th>
              <th className="px-3 py-2 text-left">Book</th>
              <th className="px-3 py-2 text-left">Nome conto</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Saldo attuale</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
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
                <td className="px-3 py-2 text-sm text-foreground">{account.nome}</td>
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
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={8}>
                  Nessun conto registrato. Usa &quot;Nuovo conto&quot; per crearne uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AccountCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <AccountMovementModal
        open={movementForAccount != null}
        onOpenChange={(open) => {
          if (!open) setMovementForAccount(undefined)
        }}
        defaultAccountId={movementForAccount}
      />
    </section>
  )
}

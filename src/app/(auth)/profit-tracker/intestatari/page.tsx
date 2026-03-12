'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { HolderCreateModal, HolderEditModal } from '@/components/profit-tracker/holder-modals'
import { AccountCreateModal } from '@/components/profit-tracker/account-create-modal'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'

export default function IntestatariPage() {
  const holders = useProfitTrackerStore((s) => s.holders)
  const isLoadingHolders = useProfitTrackerStore((s) => s.isLoadingHolders)
  const holdersError = useProfitTrackerStore((s) => s.holdersError)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)

  const [createOpen, setCreateOpen] = useState(false)
  const [editHolderId, setEditHolderId] = useState<string | null>(null)
  const [newAccountHolderId, setNewAccountHolderId] = useState<string | null>(null)
  const [newWalletHolderId, setNewWalletHolderId] = useState<string | null>(null)

  const currentEditHolder = holders.find((h) => h.id === editHolderId) ?? null

  useEffect(() => {
    if (!holders.length) {
      void fetchHolders()
    }
  }, [fetchHolders, holders.length])

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Intestatari</h1>
          <p className="text-muted-foreground">
            Gestisci gli intestatari collegati ai tuoi conti e metodi di pagamento.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Nuovo intestatario
        </Button>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingHolders && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={4}>
                  Caricamento intestatari in corso...
                </td>
              </tr>
            )}
            {!isLoadingHolders &&
              holders.map((holder) => (
                <tr key={holder.id} className="border-b border-border/40 last:border-b-0">
                  <td className="px-3 py-2 text-sm text-foreground">{holder.nome}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {holder.descrizione ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        holder.stato === 'abilitato'
                          ? 'bg-emerald-600/10 text-emerald-700'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {holder.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setNewWalletHolderId(holder.id)}
                      >
                        Nuovo wallet
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setNewAccountHolderId(holder.id)}
                      >
                        Nuovo conto
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setEditHolderId(holder.id)}
                      >
                        Modifica
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!isLoadingHolders && holders.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={4}>
                  Nessun intestatario registrato. Usa &quot;Nuovo intestatario&quot; per aggiungerne
                  uno.
                </td>
              </tr>
            )}
            {holdersError && !isLoadingHolders && (
              <tr>
                <td className="px-3 py-3 text-center text-xs text-destructive" colSpan={4}>
                  {holdersError}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <HolderCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <HolderEditModal
        open={editHolderId != null}
        onOpenChange={(open) => {
          if (!open) setEditHolderId(null)
        }}
        holder={currentEditHolder}
      />
      <AccountCreateModal
        open={newAccountHolderId != null}
        onOpenChange={(open) => {
          if (!open) setNewAccountHolderId(null)
        }}
      />
      <WalletCreateModal
        open={newWalletHolderId != null}
        onOpenChange={(open) => {
          if (!open) setNewWalletHolderId(null)
        }}
        defaultHolderId={newWalletHolderId ?? undefined}
      />
    </section>
  )
}

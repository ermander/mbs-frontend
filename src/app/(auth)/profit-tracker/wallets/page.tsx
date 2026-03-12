'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'
import { WalletTransferModal } from '@/components/profit-tracker/wallet-transfer-modal'
import { WalletTopupExpenseModal } from '@/components/profit-tracker/wallet-topup-expense-modal'
import { StatusBadge } from '@/components/profit-tracker/status-badge'

export default function WalletsPage() {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const holders = useProfitTrackerStore((s) => s.holders)
  const updateWallet = useProfitTrackerStore((s) => s.updateWallet)

  const [createOpen, setCreateOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)

  const resolveHolderName = (holderId: string) =>
    holders.find((h) => h.id === holderId)?.nome ?? '—'

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wallets</h1>
          <p className="text-muted-foreground">
            Configura e monitora i tuoi metodi di pagamento e i relativi saldi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => setTransferOpen(true)}>
            Trasferisci
          </Button>
          <Button variant="outline" type="button" onClick={() => setTopupOpen(true)}>
            Ricarica/Spesa
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nuovo wallet
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Intestatario</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Saldo attuale</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((wallet) => (
              <tr key={wallet.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-2 text-xs text-foreground">
                  {resolveHolderName(wallet.holderId)}
                </td>
                <td className="px-3 py-2 text-sm text-foreground">{wallet.nome}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {wallet.descrizione ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs font-medium text-foreground">
                  {wallet.saldoAttuale.toFixed(2)} €
                </td>
                <td className="px-3 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      updateWallet(wallet.id, {
                        stato: wallet.stato === 'abilitato' ? 'disabilitato' : 'abilitato',
                      })
                    }
                  >
                    <StatusBadge variant={wallet.stato === 'abilitato' ? 'enabled' : 'disabled'}>
                      {wallet.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
                    </StatusBadge>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() =>
                        updateWallet(wallet.id, {
                          descrizione: wallet.descrizione ? undefined : 'Wallet principale',
                        })
                      }
                    >
                      Modifica
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {wallets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>
                  Nessun wallet registrato. Usa &quot;Nuovo wallet&quot; per crearne uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <WalletCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <WalletTransferModal open={transferOpen} onOpenChange={setTransferOpen} />
      <WalletTopupExpenseModal open={topupOpen} onOpenChange={setTopupOpen} />
    </section>
  )
}

'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { QuickBetModal } from '@/components/profit-tracker/quick-bet-modal'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('it-IT')
}

export default function GiocateRapidePage() {
  const quickBets = useProfitTrackerStore((s) => s.quickBets)
  const isLoadingQuickBets = useProfitTrackerStore((s) => s.isLoadingQuickBets)
  const quickBetsError = useProfitTrackerStore((s) => s.quickBetsError)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchQuickBets = useProfitTrackerStore((s) => s.fetchQuickBets)
  const updateQuickBet = useProfitTrackerStore((s) => s.updateQuickBet)
  const removeQuickBet = useProfitTrackerStore((s) => s.removeQuickBet)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    void fetchAllAccounts()
  }, [fetchAllAccounts])

  useEffect(() => {
    void fetchQuickBets()
  }, [fetchQuickBets])

  const resolveAccountName = (accountId: string) =>
    allAccounts.find((a) => a.id === accountId)?.nome ?? '—'

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Giocate rapide</h1>
          <p className="text-muted-foreground">
            Registra e gestisci risultati veloci come sessioni casino, slot e giochi veloci.
          </p>
        </div>
        <Button type="button" onClick={() => setModalOpen(true)}>
          Nuova giocata
        </Button>
      </header>

      {quickBetsError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {quickBetsError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
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
                <tr key={bet.id} className="border-b border-border/40 last:border-b-0">
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
                    className={`px-3 py-2 align-top text-xs font-medium ${
                      bet.movimento >= 0 ? 'text-emerald-600' : 'text-red-500'
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
    </section>
  )
}

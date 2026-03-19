'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getErrorMessage } from '@/lib/error-utils'
import { formatEventDateDisplay } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getBets, updateBet } from '@/services/api/profit-tracker-client'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import type { OngoingBet } from '@/types/profit-tracker'

const SPORT_ICON: Record<string, string> = {
  calcio: '⚽',
  tennis: '🎾',
  basket: '🏀',
  altro: '•',
}
function getSportIcon(sport: string) {
  return SPORT_ICON[sport?.toLowerCase()] ?? '•'
}

export default function GiocateArchiviatePage() {
  const router = useRouter()
  const [bets, setBets] = useState<OngoingBet[]>([])
  const [loading, setLoading] = useState(true)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const removeOngoingBet = useProfitTrackerStore((s) => s.removeOngoingBet)

  const resolveAccountLabel = useCallback(
    (accountId: string) => {
      const account = allAccounts.find((a) => a.id === accountId)
      if (!account) return '—'
      const book = books.find((b) => b.id === account.bookId)
      const holder = holders.find((h) => h.id === account.holderId)
      if (!book || !holder) return account.nome
      return `${book.nome} (${holder.nome})`
    },
    [allAccounts, books, holders],
  )

  const loadArchived = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getBets({ archiviata: true })
      setBets(list)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Errore nel caricamento delle giocate archiviate.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAllAccounts()
    void loadArchived()
  }, [fetchAllAccounts, loadArchived])

  const handleRipristina = async (id: string) => {
    try {
      await updateBet(id, { archiviata: false })
      setBets((prev) => prev.filter((b) => b.id !== id))
      router.push(`/profit-tracker/giocate-in-corso/${id}`)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Errore nel ripristino.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questa giocata?')) return
    try {
      await removeOngoingBet(id)
      setBets((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      window.alert(getErrorMessage(err) ?? "Errore nell'eliminazione.")
    }
  }

  return (
    <ProfitTrackerPageShell
      sectionTitle="Giocate archiviate"
      sectionDescription="Storico delle giocate chiuse, con accesso rapido a profitti e dettagli."
    >
      {loading && (
        <p className="text-sm text-muted-foreground">Caricamento giocate archiviate...</p>
      )}

      <div className="block space-y-4 sm:hidden">
        {bets.map((bet) => {
          const { datePart, timePart } = formatEventDateDisplay(bet.eventoData)
          return (
            <div
              key={bet.id}
              className="rounded-xl border border-border bg-card/70 p-4 opacity-90 shadow-sm"
            >
              <h2 className="text-base font-semibold leading-snug text-foreground">
                {bet.eventoNome}
              </h2>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                  {datePart} {timePart}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs capitalize text-muted-foreground"
                  title={bet.sport}
                >
                  <span aria-hidden>{getSportIcon(bet.sport)}</span>
                  {bet.sport}
                </span>
                <span className="rounded-md bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  ID {bet.id}
                </span>
              </div>

              <div className="mt-3 grid gap-3 text-xs">
                <div className="flex justify-between gap-3 border-b border-border/40 pb-2">
                  <span className="shrink-0 text-muted-foreground">Modalità saldo</span>
                  <span className="text-right capitalize text-foreground">{bet.modalitaSaldo}</span>
                </div>
                <div className="flex justify-between gap-3 border-b border-border/40 pb-2">
                  <span className="shrink-0 text-muted-foreground">Conto principale</span>
                  <span className="min-w-0 text-right text-foreground">
                    {resolveAccountLabel(bet.accountId)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-b border-border/40 pb-2">
                  <span className="shrink-0 text-muted-foreground">Stato</span>
                  <span className="text-right capitalize text-foreground">
                    {bet.statoEvento.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Tag</span>
                  <p className="rounded-md bg-muted/30 px-2 py-1.5 text-muted-foreground">
                    {bet.tag ?? '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Nota</span>
                  <p className="rounded-md bg-muted/30 px-2 py-1.5 text-muted-foreground">
                    {bet.nota ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  onClick={() => router.push(`/profit-tracker/giocate-archiviate/${bet.id}`)}
                >
                  Dettaglio
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={() => void handleRipristina(bet.id)}
                  >
                    Ripristina
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => void handleDelete(bet.id)}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {!loading && bets.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessuna giocata archiviata.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Sport</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Modalità saldo</th>
              <th className="px-3 py-2 text-left">Conto principale</th>
              <th className="px-3 py-2 text-left">Tag</th>
              <th className="px-3 py-2 text-left">Nota</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr key={bet.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                  {bet.id}
                </td>
                <td className="px-3 py-2 text-center align-top text-xs text-muted-foreground">
                  {(() => {
                    const { datePart, timePart } = formatEventDateDisplay(bet.eventoData)
                    return (
                      <span className="whitespace-nowrap">
                        {datePart} {timePart}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground" title={bet.sport}>
                  <span aria-hidden>{getSportIcon(bet.sport)}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top text-sm text-foreground">
                  {bet.eventoNome}
                </td>
                <td className="px-3 py-2 align-top text-xs capitalize text-muted-foreground">
                  {bet.modalitaSaldo}
                </td>
                <td className="px-3 py-2 align-top text-xs text-foreground">
                  {resolveAccountLabel(bet.accountId)}
                </td>
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                  {bet.tag ?? '—'}
                </td>
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                  {bet.nota ?? '—'}
                </td>
                <td className="px-3 py-2 align-top text-xs capitalize text-muted-foreground">
                  {bet.statoEvento.replace('_', ' ')}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      onClick={() => router.push(`/profit-tracker/giocate-archiviate/${bet.id}`)}
                    >
                      Dettaglio
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => handleRipristina(bet.id)}
                    >
                      Ripristina
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(bet.id)}
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && bets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={10}>
                  Nessuna giocata archiviata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProfitTrackerPageShell>
  )
}

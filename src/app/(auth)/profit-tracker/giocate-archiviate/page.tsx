'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getErrorMessage } from '@/lib/error-utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getBets, updateBet } from '@/services/api/profit-tracker-client'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import type { OngoingBet } from '@/types/profit-tracker'

/** Formatta data e ora senza secondi (es. 14/03/2026, 16:00) */
function formatDate(date: string) {
  return new Date(date).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
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
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                  {formatDate(bet.eventoData)}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground" title={bet.sport}>
                  <span aria-hidden>{getSportIcon(bet.sport)}</span>
                </td>
                <td className="px-3 py-2 align-top text-sm text-foreground">{bet.eventoNome}</td>
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

'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

function formatDate(date: string) {
  return new Date(date).toLocaleString('it-IT')
}

export default function GiocateInCorsoPage() {
  const router = useRouter()
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const bets = useMemo(() => ongoingBets.filter((b) => !b.archiviata), [ongoingBets])
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const addBet = useProfitTrackerStore((s) => s.addOngoingBet)
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)
  const removeBet = useProfitTrackerStore((s) => s.removeOngoingBet)

  useEffect(() => {
    void fetchAllAccounts()
  }, [fetchAllAccounts])

  const resolveAccountLabel = (accountId: string) => {
    const account = allAccounts.find((a) => a.id === accountId)
    if (!account) return '—'
    const book = books.find((b) => b.id === account.bookId)
    const holder = holders.find((h) => h.id === account.holderId)
    if (!book || !holder) return account.nome
    return `${book.nome} (${holder.nome})`
  }

  const handleArchive = (id: string) => {
    updateBet(id, { archiviata: true, statoEvento: 'annullato' })
  }

  const handleClone = (id: string) => {
    const original = bets.find((b) => b.id === id)
    if (!original) return
    const { id: _omitId, archiviata: _omitArchiviata, ...rest } = original
    void _omitId
    void _omitArchiviata
    addBet({
      ...rest,
      statoEvento: 'bozza',
      tag: original.tag ? `${original.tag} (clonata)` : 'Clonata',
    })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questa giocata?')) return
    removeBet(id)
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Giocate in corso</h1>
        <p className="text-muted-foreground">
          Elenco delle giocate attualmente aperte salvate nel Profit Tracker.
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Sport</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Modalità saldo</th>
              <th className="px-3 py-2 text-left">Conto</th>
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
                <td className="px-3 py-2 align-top text-xs uppercase text-muted-foreground">
                  {bet.sport}
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
                      onClick={() => router.push(`/profit-tracker/giocate-in-corso/${bet.id}`)}
                    >
                      Dettaglio
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => handleArchive(bet.id)}
                    >
                      Archivia
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => handleClone(bet.id)}
                    >
                      Clona
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
            {bets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={10}>
                  Nessuna giocata in corso. Aggiungi una giocata dai calcolatori o dagli strumenti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

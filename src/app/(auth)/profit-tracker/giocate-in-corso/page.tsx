'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getErrorMessage } from '@/lib/error-utils'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
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

/** Icone sport già usate nel progetto (oddsmatcher) */
const SPORT_ICON: Record<string, string> = {
  calcio: '⚽',
  tennis: '🎾',
  basket: '🏀',
  altro: '•',
}
function getSportIcon(sport: string) {
  return SPORT_ICON[sport?.toLowerCase()] ?? '•'
}

type EditingCell = { betId: string; field: 'tag' | 'nota'; value: string }

export default function GiocateInCorsoPage() {
  const router = useRouter()
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const bets = useMemo(() => ongoingBets.filter((b) => !b.archiviata), [ongoingBets])
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchOngoingBets = useProfitTrackerStore((s) => s.fetchOngoingBets)
  const isLoadingOngoingBets = useProfitTrackerStore((s) => s.isLoadingOngoingBets)
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const addBet = useProfitTrackerStore((s) => s.addOngoingBet)
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)
  const removeBet = useProfitTrackerStore((s) => s.removeOngoingBet)

  useEffect(() => {
    void fetchOngoingBets()
    void fetchAllAccounts()
  }, [fetchOngoingBets, fetchAllAccounts])

  const resolveAccountLabel = (accountId: string) => {
    const account = allAccounts.find((a) => a.id === accountId)
    if (!account) return '—'
    const book = books.find((b) => b.id === account.bookId)
    const holder = holders.find((h) => h.id === account.holderId)
    if (!book || !holder) return account.nome
    return `${book.nome} (${holder.nome})`
  }

  const handleArchive = async (id: string) => {
    try {
      await updateBet(id, { archiviata: true })
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Impossibile archiviare la giocata.')
    }
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questa giocata?')) return
    try {
      await removeBet(id)
    } catch {
      // Error already set in store
    }
  }

  const handleCellBlur = (bet: OngoingBet) => {
    if (!editingCell || editingCell.betId !== bet.id) return
    const newValue = editingCell.value.trim() || undefined
    const current = editingCell.field === 'tag' ? bet.tag : bet.nota
    if (newValue !== (current ?? '')) {
      void updateBet(bet.id, { [editingCell.field]: newValue })
    }
    setEditingCell(null)
  }

  return (
    <ProfitTrackerPageShell
      sectionTitle="Giocate in corso"
      sectionDescription="Elenco operativo delle giocate attualmente aperte nel Profit Tracker."
    >
      {isLoadingOngoingBets && (
        <p className="text-sm text-muted-foreground">Caricamento giocate...</p>
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
              <th
                className="px-3 py-2 text-left"
                title="Conto della prima puntata; altri conti nel dettaglio"
              >
                Conto principale
              </th>
              <th className="px-3 py-2 text-left">Tag</th>
              <th className="px-3 py-2 text-left">Nota</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => {
              const shouldHighlight = bet.eventoNotificato && bet.hasOpenLegs
              return (
                <tr
                  key={bet.id}
                  className={`border-b border-border/40 last:border-b-0 ${
                    shouldHighlight ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''
                  }`}
                >
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
                  <td className="px-3 py-2 align-top">
                    {editingCell?.betId === bet.id && editingCell?.field === 'tag' ? (
                      <input
                        type="text"
                        className="w-full min-w-[6rem] rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        value={editingCell.value}
                        onChange={(e) =>
                          setEditingCell((c) => (c ? { ...c, value: e.target.value } : null))
                        }
                        onBlur={() => handleCellBlur(bet)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && (e.target as HTMLInputElement).blur()
                        }
                        autoFocus
                        placeholder="Tag"
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full min-w-[6rem] rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/60"
                        onClick={() =>
                          setEditingCell({
                            betId: bet.id,
                            field: 'tag',
                            value: bet.tag ?? '',
                          })
                        }
                      >
                        {bet.tag ?? '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {editingCell?.betId === bet.id && editingCell?.field === 'nota' ? (
                      <input
                        type="text"
                        className="w-full min-w-[8rem] rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        value={editingCell.value}
                        onChange={(e) =>
                          setEditingCell((c) => (c ? { ...c, value: e.target.value } : null))
                        }
                        onBlur={() => handleCellBlur(bet)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && (e.target as HTMLInputElement).blur()
                        }
                        autoFocus
                        placeholder="Nota"
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full min-w-[8rem] rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/60"
                        onClick={() =>
                          setEditingCell({
                            betId: bet.id,
                            field: 'nota',
                            value: bet.nota ?? '',
                          })
                        }
                      >
                        {bet.nota ?? '—'}
                      </button>
                    )}
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
              )
            })}
            {bets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={9}>
                  Nessuna giocata in corso. Aggiungi una giocata dai calcolatori o dagli strumenti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProfitTrackerPageShell>
  )
}

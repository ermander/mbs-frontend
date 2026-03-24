'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getErrorMessage } from '@/lib/error-utils'
import { formatEventDateDisplay } from '@/lib/utils'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { OngoingBet } from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

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

function isMultipla(bet: OngoingBet) {
  return bet.eventoNome.toUpperCase().startsWith('MULTIPLA')
}

type EditingCell = { betId: string; field: 'tag' | 'nota'; value: string }

export { GiocateInCorsoPage as GiocateInCorsoContent }
export default function GiocateInCorsoPage() {
  const router = useRouter()
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const bets = useMemo(
    () =>
      ongoingBets
        .filter((b) => !b.archiviata)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ongoingBets],
  )
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchOngoingBets = useProfitTrackerStore((s) => s.fetchOngoingBets)
  const isLoadingOngoingBets = useProfitTrackerStore((s) => s.isLoadingOngoingBets)
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const saveBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const fetchBetWithLegs = useProfitTrackerStore((s) => s.fetchBetWithLegs)
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

  const [cloningId, setCloningId] = useState<string | null>(null)

  const handleClone = async (id: string) => {
    const original = bets.find((b) => b.id === id)
    if (!original) return
    setCloningId(id)
    try {
      const { legs } = await fetchBetWithLegs(id)
      const betPayload = {
        eventoData: original.eventoData,
        sport: original.sport,
        eventoNome: original.eventoNome,
        modalitaSaldo: original.modalitaSaldo,
        accountId: original.accountId,
        tag: original.tag ? `${original.tag} (clonata)` : 'Clonata',
        nota: original.nota ?? null,
      }
      const legsPayload = legs.map((leg) => ({
        eventoData: leg.eventoData,
        sport: leg.sport,
        eventoNome: leg.eventoNome,
        competizione: leg.competizione,
        mercato: leg.mercato,
        selezione: leg.selezione,
        metodo: leg.metodo,
        tipoBonus: leg.tipoBonus,
        accountId: leg.accountId,
        stake: leg.stake,
        quota: leg.quota,
        quotaRiferimento: leg.quotaRiferimento,
        rischio: leg.rischio,
        bonusValore: leg.bonusValore,
        rimborsoValore: leg.rimborsoValore,
        commissionePercentuale: leg.commissionePercentuale,
        movimento: leg.movimento,
        statoEvento: 'bozza' as const,
        tag: leg.tag ?? null,
      }))
      const clonedBet = await saveBetFromCalculator(betPayload, legsPayload)
      await updateBet(clonedBet.id, { statoEvento: 'bozza' })
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Impossibile clonare la giocata.')
    } finally {
      setCloningId(null)
    }
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

      <div className="block space-y-4 sm:hidden">
        {bets.map((bet) => {
          const shouldHighlight = bet.eventoNotificato && bet.hasOpenLegs
          const multipla = isMultipla(bet)
          const { datePart, timePart } = formatEventDateDisplay(bet.eventoData)
          return (
            <div
              key={bet.id}
              className={cn(
                'rounded-xl border border-border bg-card/70 p-4 shadow-sm',
                shouldHighlight && 'bg-amber-500/10',
              )}
            >
              <div className="flex items-start gap-2">
                <h2 className="text-base font-semibold leading-snug text-foreground">
                  {bet.eventoNome}
                </h2>
                {multipla ? (
                  <span className="mt-0.5 shrink-0 rounded-full border border-neon-lavender/20 bg-neon-lavender/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-lavender">
                    Multipla
                  </span>
                ) : (
                  <span className="mt-0.5 shrink-0 rounded-full border border-neon-blue/20 bg-neon-blue/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-blue">
                    Singola
                  </span>
                )}
              </div>

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
                  <span className="shrink-0 text-muted-foreground">Data creazione</span>
                  <span className="text-right text-foreground">
                    {(() => {
                      const { datePart, timePart } = formatEventDateDisplay(bet.createdAt)
                      return `${datePart} ${timePart}`
                    })()}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Tag</span>
                  {editingCell?.betId === bet.id && editingCell?.field === 'tag' ? (
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editingCell.value}
                      onChange={(e) =>
                        setEditingCell((c) => (c ? { ...c, value: e.target.value } : null))
                      }
                      onBlur={() => handleCellBlur(bet)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      autoFocus
                      placeholder="Tag"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-md border border-transparent bg-muted/30 px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60"
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
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Nota</span>
                  {editingCell?.betId === bet.id && editingCell?.field === 'nota' ? (
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editingCell.value}
                      onChange={(e) =>
                        setEditingCell((c) => (c ? { ...c, value: e.target.value } : null))
                      }
                      onBlur={() => handleCellBlur(bet)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      autoFocus
                      placeholder="Nota"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-md border border-transparent bg-muted/30 px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60"
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
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  onClick={() => router.push(`/profit-tracker/giocate-in-corso/${bet.id}`)}
                >
                  Dettaglio
                </button>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={() => handleArchive(bet.id)}
                  >
                    Archivia
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                    onClick={() => handleClone(bet.id)}
                    disabled={cloningId === bet.id}
                  >
                    {cloningId === bet.id ? 'Clonando…' : 'Clona'}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(bet.id)}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {!isLoadingOngoingBets && bets.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessuna giocata in corso. Aggiungi una giocata dai calcolatori o dagli strumenti.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Data creazione</th>
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
              const multipla = isMultipla(bet)
              return (
                <tr
                  key={bet.id}
                  className={cn(
                    'border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent',
                    shouldHighlight && 'bg-amber-500/10',
                  )}
                >
                  <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                    {bet.id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-muted-foreground">
                    {(() => {
                      const { datePart, timePart } = formatEventDateDisplay(bet.createdAt)
                      return (
                        <span>
                          {datePart} {timePart}
                        </span>
                      )
                    })()}
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
                    <span className="inline-flex items-center gap-2">
                      {multipla ? (
                        <span className="inline-flex shrink-0 rounded-full border border-neon-lavender/20 bg-neon-lavender/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-lavender">
                          Multipla
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 rounded-full border border-neon-blue/20 bg-neon-blue/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-blue">
                          Singola
                        </span>
                      )}
                      {bet.eventoNome}
                    </span>
                  </td>
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
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                        onClick={() => handleClone(bet.id)}
                        disabled={cloningId === bet.id}
                      >
                        {cloningId === bet.id ? 'Clonando…' : 'Clona'}
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
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={10}>
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

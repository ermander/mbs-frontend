'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { notFound, useParams, useRouter } from 'next/navigation'
import { Pencil, Plus, Archive, Trash2, Check, X } from 'lucide-react'

import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { calcolaMovimento } from '@/lib/profit-tracker/calcs'
import type { BetLeg, OngoingBet } from '@/types/profit-tracker'
import { AddBetLegModal } from '@/components/profit-tracker/add-bet-leg-modal'

type EditableField = 'stake' | 'quota' | 'commissionePercentuale'

export default function BetDetailPage() {
  const params = useParams<{ betId: string }>()
  const router = useRouter()
  const betId =
    typeof params.betId === 'string'
      ? params.betId
      : Array.isArray(params.betId)
        ? params.betId[0]
        : ''

  const [loadError, setLoadError] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [notaLocal, setNotaLocal] = useState('')
  const [addLegOpen, setAddLegOpen] = useState(false)
  const [addLegMethod, setAddLegMethod] = useState<'punta' | 'banca'>('punta')
  const [editingCell, setEditingCell] = useState<{ legId: string; field: EditableField } | null>(
    null,
  )
  const [draftValue, setDraftValue] = useState<number>(0)

  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const allLegs = useProfitTrackerStore((s) => s.betLegs)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchBetWithLegs = useProfitTrackerStore((s) => s.fetchBetWithLegs)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)
  const updateBetLeg = useProfitTrackerStore((s) => s.updateBetLeg)
  const removeBetLeg = useProfitTrackerStore((s) => s.removeBetLeg)
  const addBetLegs = useProfitTrackerStore((s) => s.addBetLegs)
  const removeOngoingBet = useProfitTrackerStore((s) => s.removeOngoingBet)

  const bet = useMemo(() => ongoingBets.find((b) => b.id === betId), [ongoingBets, betId])
  const legs = useMemo(() => allLegs.filter((l) => l.betId === betId), [allLegs, betId])

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

  useEffect(() => {
    if (!betId) return
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    void fetchAllAccounts()
    fetchBetWithLegs(betId)
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [betId, fetchBetWithLegs, fetchAllAccounts])

  useEffect(() => {
    if (bet?.nota !== undefined) setNotaLocal(bet.nota ?? '')
  }, [bet?.nota])

  if (!betId) {
    notFound()
  }

  if (loadError || (!loading && !bet)) {
    notFound()
  }

  if (loading || !bet) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">Caricamento dettaglio giocata...</p>
      </section>
    )
  }

  const handleNotaBlur = () => {
    if (bet && notaLocal !== (bet.nota ?? '')) {
      void updateBet(bet.id, { nota: notaLocal || undefined })
    }
  }

  const handleArchive = async () => {
    if (!bet) return
    try {
      await updateBet(bet.id, { archiviata: true, statoEvento: 'annullato' })
      router.push('/profit-tracker/giocate-in-corso')
    } catch {
      // Error in store
    }
  }

  const handleDeleteBet = async () => {
    if (!bet || !window.confirm('Eliminare questa giocata?')) return
    try {
      await removeOngoingBet(bet.id)
      router.push('/profit-tracker/giocate-in-corso')
    } catch {
      // Error in store
    }
  }

  const handleCloneLeg = async (leg: BetLeg) => {
    const payload = {
      eventoData: leg.eventoData,
      sport: leg.sport,
      eventoNome: leg.eventoNome,
      competizione: leg.competizione,
      mercato: leg.mercato,
      metodo: leg.metodo,
      tipoBonus: leg.tipoBonus,
      accountId: leg.accountId,
      stake: leg.stake,
      quota: leg.quota,
      rischio: leg.rischio,
      bonusValore: leg.bonusValore,
      rimborsoValore: leg.rimborsoValore,
      commissionePercentuale: leg.commissionePercentuale ?? 0,
      movimento: leg.movimento,
      statoEvento: 'bozza',
      tag: leg.tag ? `${leg.tag} (clonata)` : 'Clonata',
    }
    try {
      await addBetLegs(betId, [payload])
      setEditingCell(null)
    } catch {
      // Error in store
    }
  }

  const handleDeleteLeg = async (legId: string) => {
    if (!window.confirm('Eliminare questo elemento dalla giocata?')) return
    try {
      await removeBetLeg(betId, legId)
    } catch {
      // Error in store
    }
  }

  const handleStartEdit = (legId: string, field: EditableField, currentValue: number) => {
    setEditingCell({ legId, field })
    setDraftValue(currentValue)
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
  }

  const handleConfirmEdit = async () => {
    if (!editingCell) return
    const leg = legs.find((l) => l.id === editingCell.legId)
    if (!leg) {
      setEditingCell(null)
      return
    }
    const stake = editingCell.field === 'stake' ? draftValue : leg.stake
    const quota = editingCell.field === 'quota' ? draftValue : leg.quota
    const comm =
      editingCell.field === 'commissionePercentuale'
        ? draftValue
        : (leg.commissionePercentuale ?? 0)
    const movimento = calcolaMovimento(stake, quota, comm)
    try {
      await updateBetLeg(betId, leg.id, {
        [editingCell.field]: draftValue,
        movimento,
      })
      setEditingCell(null)
    } catch {
      // Error in store
    }
  }

  const handleLegStatoChange = (legId: string, stato: BetLeg['statoEvento']) => {
    void updateBetLeg(betId, legId, { statoEvento: stato })
  }

  const handleStatoChange = (stato: OngoingBet['statoEvento']) => {
    void updateBet(bet.id, { statoEvento: stato })
  }

  const isLegEditable = (leg: BetLeg) => leg.statoEvento === 'bozza'
  const totalRischio = legs.reduce((s, l) => s + l.rischio, 0)
  const totalMovimento = legs.reduce((s, l) => s + l.movimento, 0)
  const hasPuntaAndBanca =
    legs.some((l) => l.metodo === 'punta') && legs.some((l) => l.metodo === 'banca')

  const renderEditableCell = (
    leg: BetLeg,
    field: EditableField,
    displayValue: number,
    format: (v: number) => string = (v) => String(v),
  ) => {
    const isEditing = editingCell?.legId === leg.id && editingCell?.field === field
    const canEdit = isLegEditable(leg)
    const value = isEditing ? draftValue : displayValue

    if (!canEdit) {
      return <span className="text-xs text-foreground">{format(displayValue)}</span>
    }
    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <input
            type="number"
            step={field === 'commissionePercentuale' ? 0.1 : field === 'quota' ? 0.01 : 1}
            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={value}
            onChange={(e) => setDraftValue(Number(e.target.value))}
            autoFocus
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleCancelEdit}
              title="Annulla modifica"
              aria-label="Annulla modifica"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                ○
              </span>
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-amber-600 hover:bg-amber-500/20"
              onClick={handleConfirmEdit}
              title="Conferma e salva"
              aria-label="Conferma e salva"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleCancelEdit}
              title="Annulla"
              aria-label="Annulla"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )
    }
    return (
      <button
        type="button"
        className="text-left text-xs text-foreground underline-offset-2 hover:underline"
        onClick={() => handleStartEdit(leg.id, field, displayValue)}
      >
        {format(displayValue)}
      </button>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dettaglio puntata {bet.eventoNome}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestisci le informazioni complete della giocata, inclusi stake, quota, comm% e movimento.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ID giocata
            </p>
            <p className="font-mono text-sm text-foreground">{bet.id}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stato evento
            </p>
            <select
              value={bet.statoEvento}
              onChange={(e) => handleStatoChange(e.target.value as OngoingBet['statoEvento'])}
              className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="bozza">Bozza</option>
              <option value="in_corso">In corso</option>
              <option value="vinto">Vinto</option>
              <option value="perso">Perso</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="text"
            placeholder="Inserisci una nota"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={notaLocal}
            onChange={(e) => setNotaLocal(e.target.value)}
            onBlur={handleNotaBlur}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            onClick={() => {
              setAddLegMethod('punta')
              setAddLegOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nuova Puntata
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            onClick={() => {
              setAddLegMethod('banca')
              setAddLegOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nuova Bancata
          </button>
          <Link
            href="/profit-tracker/conti"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            Nuovo Deposito
          </Link>
          {hasPuntaAndBanca && (
            <span className="rounded-md bg-green-500/20 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
              Abbinata
            </span>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            onClick={handleArchive}
          >
            <Archive className="h-4 w-4" />
            Archivia
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/60 bg-transparent px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            onClick={handleDeleteBet}
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </button>
        </div>
      </div>

      {legs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Visualizzo 1–{legs.length} di {legs.length} elementi.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Competizione</th>
              <th className="px-3 py-2 text-left">Mercato</th>
              <th className="px-3 py-2 text-left">Metodo</th>
              <th className="px-3 py-2 text-left">Tipo bonus</th>
              <th className="px-3 py-2 text-left">Conto</th>
              <th className="px-3 py-2 text-left">Stake</th>
              <th className="px-3 py-2 text-left">Quota</th>
              <th className="px-3 py-2 text-left">Comm %</th>
              <th className="px-3 py-2 text-left">Rischio</th>
              <th className="px-3 py-2 text-left">Bonus</th>
              <th className="px-3 py-2 text-left">Rimborso</th>
              <th className="px-3 py-2 text-left">Tasse</th>
              <th className="px-3 py-2 text-left">Mov.</th>
              <th className="px-3 py-2 text-left">Stato evento</th>
              <th className="px-3 py-2 text-left">Tag</th>
              <th className="px-3 py-2 text-left">Opzioni</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg) => (
              <tr key={leg.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(leg.eventoData).toLocaleString('it-IT')}
                </td>
                <td className="px-3 py-2 text-xs text-foreground">{leg.eventoNome}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.competizione}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.mercato}</td>
                <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{leg.metodo}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.tipoBonus}</td>
                <td className="px-3 py-2 text-xs text-foreground">
                  {resolveAccountLabel(leg.accountId)}
                </td>
                <td className="px-3 py-2">
                  {renderEditableCell(leg, 'stake', leg.stake, (v) => v.toFixed(2))}
                </td>
                <td className="px-3 py-2">
                  {renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(2))}
                </td>
                <td className="px-3 py-2">
                  {renderEditableCell(
                    leg,
                    'commissionePercentuale',
                    leg.commissionePercentuale ?? 0,
                    (v) => `${v.toFixed(1)}%`,
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-foreground">{leg.rischio.toFixed(2)} €</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {leg.bonusValore != null ? `${leg.bonusValore.toFixed(2)} €` : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {leg.rimborsoValore != null ? `${leg.rimborsoValore.toFixed(2)} €` : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">—</td>
                <td className="px-3 py-2 text-xs font-medium text-foreground">
                  {leg.movimento.toFixed(2)} €
                </td>
                <td className="px-3 py-2">
                  <select
                    value={leg.statoEvento}
                    onChange={(e) =>
                      handleLegStatoChange(leg.id, e.target.value as BetLeg['statoEvento'])
                    }
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    <option value="bozza">Bozza</option>
                    <option value="in_corso">In corso</option>
                    <option value="vinto">Vinto</option>
                    <option value="perso">Perso</option>
                    <option value="annullato">Annullato</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.tag ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() => handleCloneLeg(leg)}
                    >
                      Clona
                    </button>
                    <button
                      type="button"
                      className="text-xs text-destructive underline-offset-2 hover:underline"
                      onClick={() => handleDeleteLeg(leg.id)}
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {legs.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={18}>
                  Nessun esito registrato per questa giocata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {legs.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Totale Rischio: </span>
              <span className="font-medium text-foreground">{totalRischio.toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-muted-foreground">Guadagno Totale: </span>
              <span
                className={`font-medium ${
                  totalMovimento >= 0 ? 'text-foreground' : 'text-destructive'
                }`}
              >
                {totalMovimento.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}

      <AddBetLegModal
        open={addLegOpen}
        onOpenChange={setAddLegOpen}
        betId={betId}
        defaultMethod={addLegMethod}
        onSuccess={() => void fetchBetWithLegs(betId)}
      />
    </section>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { notFound, useParams, useRouter } from 'next/navigation'
import { Ban, Pencil, Plus, Archive, Trash2, Check, X } from 'lucide-react'

import { getErrorMessage } from '@/lib/error-utils'
import { multiplaLayStakes } from '@/lib/calculators/punta-banca'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { BetLeg } from '@/types/profit-tracker'
import { AddBetLegModal } from '@/components/profit-tracker/add-bet-leg-modal'
import { SearchableSelect } from '@/components/ui/searchable-select'

/** Formatta data e ora senza secondi (es. 14/03/2026, 18:00) */
function formatEventDate(date: string) {
  return new Date(date).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TIPO_BONUS_OPTIONS: { value: BetLeg['tipoBonus']; label: string }[] = [
  { value: 'none', label: 'Nessuno' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'rimborso', label: 'Rimborso' },
  { value: 'freebet', label: 'Freebet' },
]

function statoEventoClasses(stato: BetLeg['statoEvento']): string {
  switch (stato) {
    case 'vinto':
      return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40'
    case 'perso':
      return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40'
    case 'in_corso':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
    case 'annullato':
      return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/40'
    default:
      return 'bg-background border-border'
  }
}

type EditableField =
  | 'stake'
  | 'quota'
  | 'quotaRiferimento'
  | 'commissionePercentuale'
  | 'bonusValore'
  | 'rimborsoValore'

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
  const [editingTextCell, setEditingTextCell] = useState<{ legId: string; field: string } | null>(
    null,
  )
  const [draftTextValue, setDraftTextValue] = useState('')
  const [editingDateLegId, setEditingDateLegId] = useState<string | null>(null)
  const [draftDateLocal, setDraftDateLocal] = useState('')

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
  const legs = useMemo(() => {
    const filtered = allLegs.filter((l) => l.betId === betId)
    return filtered.sort((a, b) => {
      if (a.metodo === 'punta' && b.metodo !== 'punta') return -1
      if (a.metodo !== 'punta' && b.metodo === 'punta') return 1
      return new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
    })
  }, [allLegs, betId])

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

  const accountSelectOptions = useMemo(
    () =>
      allAccounts.map((a) => ({
        value: a.id,
        label: resolveAccountLabel(a.id),
      })),
    [allAccounts, resolveAccountLabel],
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
      await updateBet(bet.id, { archiviata: true })
      router.push('/profit-tracker/giocate-in-corso')
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Impossibile archiviare la giocata.')
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
      quotaRiferimento: leg.quotaRiferimento,
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
    const value =
      editingCell.field === 'bonusValore' || editingCell.field === 'rimborsoValore'
        ? Number.isFinite(draftValue)
          ? draftValue
          : 0
        : draftValue
    try {
      const patch: Record<string, unknown> = { [editingCell.field]: value }
      if (editingCell.field === 'stake' && leg.metodo === 'punta') {
        patch.rischio = value
      }
      await updateBetLeg(betId, leg.id, patch as Parameters<typeof updateBetLeg>[2])
      setEditingCell(null)

      const puntaLeg = legs.find((l) => l.metodo === 'punta')
      const bancaLegs = legs
        .filter((l) => l.metodo === 'banca')
        .sort((a, b) => new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime())
      const isMultipla = bancaLegs.length >= 2 && puntaLeg != null

      if (isMultipla) {
        const field = editingCell.field
        const editedIsBanca = leg.metodo === 'banca'
        const needsRecalc =
          (field === 'quotaRiferimento' && editedIsBanca) ||
          (field === 'quota' && editedIsBanca) ||
          (field === 'commissionePercentuale' && editedIsBanca)
        const puntaQuotaChanged = field === 'quota' && !editedIsBanca

        if (needsRecalc) {
          const updatedBancaLegs = bancaLegs.map((l) => {
            if (l.id !== leg.id) return l
            return { ...l, [field]: value }
          })

          if (field === 'quotaRiferimento') {
            const newTotalOdds =
              Math.round(
                updatedBancaLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1) * 100,
              ) / 100
            await updateBetLeg(betId, puntaLeg.id, { quota: newTotalOdds })
          }

          const totalBackOdds =
            field === 'quotaRiferimento'
              ? Math.round(
                  updatedBancaLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1) * 100,
                ) / 100
              : puntaLeg.quota

          const backStakeTotale = puntaLeg.stake + (puntaLeg.bonusValore ?? 0)

          const eventsForCalc = updatedBancaLegs.map((l) => ({
            layOdds: l.quota,
            commissionPercent: l.commissionePercentuale ?? 3,
          }))

          const results = multiplaLayStakes(backStakeTotale, totalBackOdds, eventsForCalc)

          for (let i = 0; i < updatedBancaLegs.length; i++) {
            const bl = updatedBancaLegs[i]!
            const r = results[i]!
            await updateBetLeg(betId, bl.id, {
              stake: r.layStake,
              rischio: r.liability,
            })
          }
        } else if (puntaQuotaChanged) {
          const totalBackOdds = value as number
          const backStakeTotale = puntaLeg.stake + (puntaLeg.bonusValore ?? 0)
          const eventsForCalc = bancaLegs.map((l) => ({
            layOdds: l.quota,
            commissionPercent: l.commissionePercentuale ?? 3,
          }))
          const results = multiplaLayStakes(backStakeTotale, totalBackOdds, eventsForCalc)
          for (let i = 0; i < bancaLegs.length; i++) {
            const bl = bancaLegs[i]!
            const r = results[i]!
            await updateBetLeg(betId, bl.id, {
              stake: r.layStake,
              rischio: r.liability,
            })
          }
        }
      }

      await fetchBetWithLegs(betId)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Errore nel salvataggio.')
    }
  }

  const handleLegStatoChange = async (legId: string, stato: BetLeg['statoEvento']) => {
    try {
      await updateBetLeg(betId, legId, { statoEvento: stato })
      await fetchBetWithLegs(betId)
      await fetchAllAccounts()
    } catch (err) {
      window.alert(getErrorMessage(err) ?? "Errore nell'aggiornamento dello stato.")
    }
  }

  const handleTipoBonusChange = async (legId: string, tipoBonus: BetLeg['tipoBonus']) => {
    try {
      await updateBetLeg(betId, legId, { tipoBonus })
      await fetchBetWithLegs(betId)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? "Errore nell'aggiornamento del tipo bonus.")
    }
  }

  const handleAccountChange = async (legId: string, accountId: string) => {
    try {
      await updateBetLeg(betId, legId, { accountId })
      await fetchBetWithLegs(betId)
      await fetchAllAccounts()
    } catch (err) {
      window.alert(getErrorMessage(err) ?? "Errore nell'assegnazione del conto.")
    }
  }

  const isLegEditable = (leg: BetLeg) => leg.statoEvento === 'bozza'
  const totalRischio = legs
    .filter((l) => l.metodo === 'banca')
    .reduce((s, l) => s + (l.rischio ?? 0), 0)
  const totalMovimento = legs.reduce((s, l) => s + l.movimento, 0)
  const hasPuntaAndBanca =
    legs.some((l) => l.metodo === 'punta') && legs.some((l) => l.metodo === 'banca')
  const countPunta = legs.filter((l) => l.metodo === 'punta').length
  const countBanca = legs.filter((l) => l.metodo === 'banca').length
  const legsSummary =
    countPunta > 0 || countBanca > 0
      ? [
          countPunta > 0 && `${countPunta} puntat${countPunta === 1 ? 'a' : 'e'}`,
          countBanca > 0 && `${countBanca} bancat${countBanca === 1 ? 'a' : 'e'}`,
        ]
          .filter(Boolean)
          .join(', ')
      : ''

  const canEditField = (leg: BetLeg, field: EditableField) => {
    if (field === 'bonusValore') return leg.tipoBonus === 'bonus'
    if (field === 'rimborsoValore') return leg.tipoBonus === 'rimborso'
    return isLegEditable(leg)
  }

  const renderEditableCell = (
    leg: BetLeg,
    field: EditableField,
    displayValue: number,
    format: (v: number) => string = (v) => String(v),
  ) => {
    const isEditing = editingCell?.legId === leg.id && editingCell?.field === field
    const canEdit = canEditField(leg, field)
    const value = isEditing ? draftValue : displayValue

    if (!canEdit) {
      const lockedStyle = !isLegEditable(leg)
        ? 'text-xs text-muted-foreground'
        : 'text-xs text-foreground'
      return <span className={lockedStyle}>{format(displayValue)}</span>
    }
    if (isEditing) {
      const step =
        field === 'commissionePercentuale'
          ? 0.1
          : field === 'quota' || field === 'quotaRiferimento'
            ? 0.01
            : field === 'bonusValore' || field === 'rimborsoValore'
              ? 0.01
              : 1
      return (
        <div className="flex flex-col gap-1">
          <input
            type="number"
            step={step}
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
        className="rounded bg-sky-50 px-1.5 py-0.5 text-left text-xs text-foreground ring-1 ring-sky-200/60 hover:bg-sky-100 dark:bg-sky-950/30 dark:ring-sky-800/40 dark:hover:bg-sky-900/40"
        onClick={() => handleStartEdit(leg.id, field, displayValue)}
      >
        {format(displayValue)}
      </button>
    )
  }

  const handleStartTextEdit = (legId: string, field: string, currentValue: string) => {
    setEditingTextCell({ legId, field })
    setDraftTextValue(currentValue)
  }

  const handleConfirmTextEdit = async () => {
    if (!editingTextCell) return
    const leg = legs.find((l) => l.id === editingTextCell.legId)
    if (!leg) {
      setEditingTextCell(null)
      return
    }
    try {
      await updateBetLeg(betId, leg.id, {
        [editingTextCell.field]: draftTextValue,
      } as Parameters<typeof updateBetLeg>[2])
      setEditingTextCell(null)
      await fetchBetWithLegs(betId)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Errore nel salvataggio.')
    }
  }

  const renderEditableTextCell = (leg: BetLeg, field: string, displayValue: string) => {
    const isEditing = editingTextCell?.legId === leg.id && editingTextCell?.field === field
    if (!isLegEditable(leg)) {
      return <span className="text-xs text-muted-foreground">{displayValue}</span>
    }
    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={draftTextValue}
            onChange={(e) => setDraftTextValue(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setEditingTextCell(null)}
              title="Annulla"
              aria-label="Annulla"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-amber-600 hover:bg-amber-500/20"
              onClick={handleConfirmTextEdit}
              title="Conferma e salva"
              aria-label="Conferma e salva"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        </div>
      )
    }
    return (
      <button
        type="button"
        className="rounded bg-sky-50 px-1.5 py-0.5 text-left text-xs text-foreground ring-1 ring-sky-200/60 hover:bg-sky-100 dark:bg-sky-950/30 dark:ring-sky-800/40 dark:hover:bg-sky-900/40"
        onClick={() => handleStartTextEdit(leg.id, field, displayValue)}
      >
        {displayValue}
      </button>
    )
  }

  const canEditLegEventDate = (leg: BetLeg) =>
    leg.statoEvento === 'bozza' || leg.statoEvento === 'in_corso'

  const toDatetimeLocalValue = (iso: string) => {
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const min = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  const handleStartDateEdit = (leg: BetLeg) => {
    setEditingDateLegId(leg.id)
    setDraftDateLocal(toDatetimeLocalValue(leg.eventoData))
  }

  const handleCancelDateEdit = () => {
    setEditingDateLegId(null)
    setDraftDateLocal('')
  }

  const handleConfirmDateEdit = async () => {
    if (!editingDateLegId) return
    const leg = legs.find((l) => l.id === editingDateLegId)
    if (!leg) {
      handleCancelDateEdit()
      return
    }
    const parsed = new Date(draftDateLocal)
    if (!Number.isFinite(parsed.getTime())) return

    try {
      await updateBetLeg(betId, leg.id, { eventoData: parsed.toISOString() })
      handleCancelDateEdit()
      await fetchBetWithLegs(betId)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Errore nel salvataggio.')
    }
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
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="text-muted-foreground">ID GIOCATA </span>
            <span className="font-mono text-foreground">{bet.id}</span>
          </p>
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-2">
            {hasPuntaAndBanca && (
              <span className="inline-flex items-center gap-2">
                <span className="rounded-md bg-green-500/20 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  Abbinata
                </span>
                {legsSummary && (
                  <span className="text-xs text-muted-foreground">({legsSummary})</span>
                )}
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
      </div>

      {legs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Visualizzo 1–{legs.length} di {legs.length} elementi.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="whitespace-nowrap border-b border-border/60 bg-muted/40 text-[11px] font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Competizione</th>
              <th className="px-3 py-2 text-left">Mercato</th>
              <th className="px-3 py-2 text-left">Metodo</th>
              <th className="px-3 py-2 text-left">Tipo bonus</th>
              <th className="px-3 py-2 text-left">Conto</th>
              <th className="px-3 py-2 text-left">Stake</th>
              <th className="px-3 py-2 text-left">Q. Punta</th>
              <th className="px-3 py-2 text-left">Q. Banca</th>
              <th className="px-3 py-2 text-left">Com %</th>
              <th className="px-3 py-2 text-left">Rischio</th>
              <th className="px-3 py-2 text-left">Bonus</th>
              <th className="px-3 py-2 text-left">Rimborso</th>
              <th className="px-3 py-2 text-left">Mov.</th>
              <th className="px-3 py-2 text-left">Stato evento</th>
              <th className="px-3 py-2 text-left">Tag</th>
              <th className="px-3 py-2 text-left">Opzioni</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg) => {
              const shouldHighlightLeg =
                bet.eventoNotificato &&
                (leg.statoEvento === 'bozza' || leg.statoEvento === 'in_corso')

              return (
                <tr
                  key={leg.id}
                  className={`border-b border-border/40 align-top last:border-b-0 ${
                    shouldHighlightLeg ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''
                  } ${leg.statoEvento !== 'bozza' ? 'opacity-75' : ''}`}
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {editingDateLegId === leg.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="datetime-local"
                          className="w-[11.5rem] rounded-md border border-border bg-background px-2 py-1 text-xs"
                          value={draftDateLocal}
                          onChange={(e) => setDraftDateLocal(e.target.value)}
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={handleCancelDateEdit}
                            title="Annulla"
                            aria-label="Annulla"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-0.5 text-amber-600 hover:bg-amber-500/20"
                            onClick={() => void handleConfirmDateEdit()}
                            title="Conferma e salva"
                            aria-label="Conferma e salva"
                            disabled={!Number.isFinite(new Date(draftDateLocal).getTime())}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : canEditLegEventDate(leg) ? (
                      <button
                        type="button"
                        className="rounded bg-sky-50 px-1.5 py-0.5 text-left text-xs text-foreground ring-1 ring-sky-200/60 hover:bg-sky-100 dark:bg-sky-950/30 dark:ring-sky-800/40 dark:hover:bg-sky-900/40"
                        onClick={() => handleStartDateEdit(leg)}
                        title="Modifica data evento"
                      >
                        {formatEventDate(leg.eventoData)}
                      </button>
                    ) : (
                      formatEventDate(leg.eventoData)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {renderEditableTextCell(leg, 'eventoNome', leg.eventoNome)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{leg.competizione}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{leg.mercato}</td>
                  <td className="px-3 py-2 text-xs capitalize text-muted-foreground">
                    {leg.metodo}
                  </td>
                  <td className="px-3 py-2">
                    {leg.metodo === 'punta' ? (
                      <select
                        value={leg.tipoBonus}
                        onChange={(e) =>
                          handleTipoBonusChange(leg.id, e.target.value as BetLeg['tipoBonus'])
                        }
                        disabled={leg.statoEvento !== 'bozza'}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {TIPO_BONUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Ban className="mx-auto h-4 w-4 text-muted-foreground/50" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[260px]">
                      <SearchableSelect
                        options={accountSelectOptions}
                        value={leg.accountId}
                        onChange={(value) => handleAccountChange(leg.id, value)}
                        placeholder="Seleziona conto"
                        searchPlaceholder="Cerca conto..."
                        allowEmpty={false}
                        disabled={leg.statoEvento !== 'bozza'}
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {renderEditableCell(leg, 'stake', leg.stake, (v) => v.toFixed(2))}
                  </td>
                  <td className="px-3 py-2">
                    {leg.metodo === 'punta'
                      ? renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(2))
                      : renderEditableCell(
                          leg,
                          'quotaRiferimento',
                          leg.quotaRiferimento ?? 0,
                          (v) => (v == null || v === 0 ? '—' : Number(v).toFixed(2)),
                        )}
                  </td>
                  <td className="px-3 py-2">
                    {leg.metodo === 'punta' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(2))
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {leg.metodo === 'punta' ? (
                      <Ban className="mx-auto h-4 w-4 text-muted-foreground/50" />
                    ) : (
                      renderEditableCell(
                        leg,
                        'commissionePercentuale',
                        leg.commissionePercentuale ?? 0,
                        (v) => `${v.toFixed(1)}%`,
                      )
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {(leg.metodo === 'punta' && (leg.rischio ?? 0) === 0
                      ? leg.stake
                      : (leg.rischio ?? 0)
                    ).toFixed(2)}{' '}
                    €
                  </td>
                  <td className="px-3 py-2">
                    {renderEditableCell(leg, 'bonusValore', leg.bonusValore ?? 0, (v) =>
                      v !== 0 ? `${v.toFixed(2)} €` : '—',
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {renderEditableCell(leg, 'rimborsoValore', leg.rimborsoValore ?? 0, (v) =>
                      v !== 0 ? `${v.toFixed(2)} €` : '—',
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">
                    {leg.movimento.toFixed(2)} €
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={leg.statoEvento}
                      onChange={(e) =>
                        handleLegStatoChange(leg.id, e.target.value as BetLeg['statoEvento'])
                      }
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${statoEventoClasses(leg.statoEvento)}`}
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
                        className="rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                        onClick={() => handleCloneLeg(leg)}
                      >
                        Clona
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                        onClick={() => handleDeleteLeg(leg.id)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {legs.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={17}>
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

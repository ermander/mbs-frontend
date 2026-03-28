'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notFound, useParams, useRouter } from 'next/navigation'
import { Ban, Pencil, Plus, Archive, Trash2, Check, X } from 'lucide-react'

import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-utils'
import { formatEventDateDisplay, sanitizeDecimal } from '@/lib/utils'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { BetLeg, BetStatus, ModalitaSaldo } from '@/types/profit-tracker'

const FINAL_STATES = new Set<BetStatus>(['vinto', 'perso', 'annullato'])
import { AccountMovementModal } from '@/components/profit-tracker/account-movement-modal'
import { SearchableSelect } from '@/components/ui/searchable-select'

function renderEventDateCell(date: string) {
  const { datePart, timePart } = formatEventDateDisplay(date)
  return (
    <span className="whitespace-nowrap">
      {datePart} {timePart}
    </span>
  )
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
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    case 'perso':
      return 'bg-destructive/15 text-destructive border-destructive/20'
    case 'in_corso':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    case 'annullato':
      return 'bg-neon-lavender/15 text-neon-lavender border-neon-lavender/20'
    default:
      return 'bg-muted/50 text-muted-foreground border-border'
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
  const [notaEditing, setNotaEditing] = useState(false)
  const [editingCell, setEditingCell] = useState<{ legId: string; field: EditableField } | null>(
    null,
  )
  const [draftValue, setDraftValue] = useState<string>('')
  const [editingTextCell, setEditingTextCell] = useState<{ legId: string; field: string } | null>(
    null,
  )
  const [draftTextValue, setDraftTextValue] = useState('')
  const [editingDateLegId, setEditingDateLegId] = useState<string | null>(null)
  const [draftDateLocal, setDraftDateLocal] = useState('')
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const navigatingAway = useRef(false)

  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const allLegs = useProfitTrackerStore((s) => s.betLegs)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchBetWithLegs = useProfitTrackerStore((s) => s.fetchBetWithLegs)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)
  const updateBetLeg = useProfitTrackerStore((s) => s.updateBetLeg)
  const removeBetLeg = useProfitTrackerStore((s) => s.removeBetLeg)
  const addBetLegs = useProfitTrackerStore((s) => s.addBetLegs)
  const removeOngoingBet = useProfitTrackerStore((s) => s.removeOngoingBet)
  const tags = useProfitTrackerStore((s) => s.tags)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)

  const bet = useMemo(() => ongoingBets.find((b) => b.id === betId), [ongoingBets, betId])
  const legs = useMemo(() => {
    const filtered = allLegs.filter((l) => l.betId === betId)
    return filtered.sort((a, b) => {
      const posA = a.posizione ?? 999
      const posB = b.posizione ?? 999
      if (posA !== posB) return posA - posB
      if (a.metodo === 'punta' && b.metodo !== 'punta') return -1
      if (a.metodo !== 'punta' && b.metodo === 'punta') return 1
      const byDate = new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
      if (byDate !== 0) return byDate
      if (a.quota !== b.quota) return a.quota - b.quota
      return String(a.id).localeCompare(String(b.id))
    })
  }, [allLegs, betId])

  const hasLegsInCorso = useMemo(() => legs.some((l) => l.statoEvento === 'in_corso'), [legs])

  const isMultipla = useMemo(() => {
    const puntaLeg = legs.find((l) => l.metodo === 'punta')
    if (puntaLeg == null) return false
    // Hedge legs = tutto tranne la prima punta (include sia banca che punta-punta)
    const hedgeLegs = legs.filter((l) => l.id !== puntaLeg.id)
    if (hedgeLegs.length < 2) return false
    // Bancate/coperture parziali (stesso evento/mercato/selezione) non sono una multipla
    const first = hedgeLegs[0]
    const isPartialLay = hedgeLegs.every(
      (l) =>
        l.eventoNome === first.eventoNome &&
        l.mercato === first.mercato &&
        l.selezione === first.selezione,
    )
    return !isPartialLay
  }, [legs])

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

  const puntaAccountOptions = useMemo(
    () =>
      allAccounts
        .filter((a) => {
          const book = books.find((b) => b.id === a.bookId)
          return book && !book.isExchange
        })
        .map((a) => ({ value: a.id, label: resolveAccountLabel(a.id) })),
    [allAccounts, books, resolveAccountLabel],
  )

  const bancaAccountOptions = useMemo(
    () =>
      allAccounts
        .filter((a) => {
          const book = books.find((b) => b.id === a.bookId)
          return book && book.isExchange
        })
        .map((a) => ({ value: a.id, label: resolveAccountLabel(a.id) })),
    [allAccounts, books, resolveAccountLabel],
  )

  const tagOptions = useMemo(
    () => [
      { value: '', label: 'Nessun tag' },
      ...tags.map((t) => ({ value: t.nome, label: t.nome })),
    ],
    [tags],
  )

  useEffect(() => {
    if (!betId) return
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    void fetchAllAccounts()
    void fetchTags()
    void fetchAllBooks()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betId])

  useEffect(() => {
    if (bet?.nota !== undefined) setNotaLocal(bet.nota ?? '')
  }, [bet?.nota])

  if (!betId) {
    notFound()
  }

  if (!navigatingAway.current && (loadError || (!loading && !bet))) {
    notFound()
  }

  if (loading || !bet) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">Caricamento dettaglio giocata...</p>
      </section>
    )
  }

  const handleNotaSave = () => {
    if (bet && notaLocal !== (bet.nota ?? '')) {
      void updateBet(bet.id, { nota: notaLocal || undefined })
    }
    setNotaEditing(false)
  }

  const handleArchive = async () => {
    if (!bet) return
    if (!window.confirm('Vuoi davvero archiviare questa giocata?')) return
    if (hasLegsInCorso) {
      toast.error('Non è possibile archiviare una giocata con scommesse ancora in corso.')
      return
    }
    try {
      navigatingAway.current = true
      await updateBet(bet.id, { archiviata: true })
      router.push('/profit-tracker/giocate-in-corso')
    } catch (err) {
      navigatingAway.current = false
      toast.error(getErrorMessage(err) ?? 'Impossibile archiviare la giocata.')
    }
  }

  const handleDeleteBet = async () => {
    if (!bet || !window.confirm('Eliminare questa giocata?')) return
    try {
      navigatingAway.current = true
      await removeOngoingBet(bet.id)
      router.push('/profit-tracker/giocate-in-corso')
    } catch (err) {
      navigatingAway.current = false
      toast.error(getErrorMessage(err) ?? 'Impossibile eliminare la giocata.')
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
      tag: null,
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
    } catch (err) {
      toast.error(getErrorMessage(err) ?? "Impossibile eliminare l'elemento.")
    }
  }

  const handleStartEdit = (legId: string, field: EditableField, currentValue: number) => {
    setEditingCell({ legId, field })
    setDraftValue(String(currentValue))
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
    const parsed = Number.parseFloat(draftValue.replace(',', '.'))
    const value =
      editingCell.field === 'bonusValore' || editingCell.field === 'rimborsoValore'
        ? Number.isFinite(parsed)
          ? parsed
          : 0
        : parsed
    try {
      const patch: Record<string, unknown> = { [editingCell.field]: value }
      if (editingCell.field === 'stake' && leg.metodo === 'punta') {
        patch.rischio = value
      }
      await updateBetLeg(betId, leg.id, patch as Parameters<typeof updateBetLeg>[2])
      setEditingCell(null)

      const puntaLeg = legs.find((l) => l.metodo === 'punta')
      const hedgeLegs = puntaLeg
        ? legs
            .filter((l) => l.id !== puntaLeg.id)
            .sort((a, b) => {
              const byDate = new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
              if (byDate !== 0) return byDate
              return String(a.id).localeCompare(String(b.id))
            })
        : []
      const isMultipla =
        hedgeLegs.length >= 2 &&
        puntaLeg != null &&
        !hedgeLegs.every(
          (l) =>
            l.eventoNome === hedgeLegs[0].eventoNome &&
            l.mercato === hedgeLegs[0].mercato &&
            l.selezione === hedgeLegs[0].selezione,
        )

      if (isMultipla) {
        const field = editingCell.field
        const editedIsHedge = leg.id !== puntaLeg.id
        const needsRecalc =
          (field === 'quotaRiferimento' && editedIsHedge) ||
          (field === 'quota' && editedIsHedge) ||
          (field === 'commissionePercentuale' && editedIsHedge)
        const puntaQuotaChanged = field === 'quota' && !editedIsHedge
        const puntaStakeChanged =
          (field === 'stake' || field === 'bonusValore' || field === 'rimborsoValore') &&
          !editedIsHedge

        if (needsRecalc) {
          const updatedHedgeLegs = hedgeLegs.map((l) => {
            if (l.id !== leg.id) return l
            return { ...l, [field]: value }
          })

          if (field === 'quotaRiferimento') {
            const newTotalOdds =
              Math.round(
                updatedHedgeLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1) * 100,
              ) / 100
            await updateBetLeg(betId, puntaLeg.id, { quota: newTotalOdds })
          }

          const totalBackOdds =
            field === 'quotaRiferimento'
              ? updatedHedgeLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1)
              : hedgeLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1)

          const backStakeTotale = puntaLeg.stake + (puntaLeg.bonusValore ?? 0)

          const eventsForCalc = updatedHedgeLegs.map((l) => ({
            type: (l.metodo === 'banca' ? 'punta-banca' : 'punta-punta') as
              | 'punta-banca'
              | 'punta-punta',
            coverOdds: l.quota,
            commissionPercent: l.commissionePercentuale ?? (l.metodo === 'banca' ? 3 : 0),
          }))

          const results = multiplaLayStakes(
            backStakeTotale,
            totalBackOdds,
            eventsForCalc,
            puntaLeg.rimborsoValore ?? 0,
          )

          for (let i = 0; i < updatedHedgeLegs.length; i++) {
            const bl = updatedHedgeLegs[i]!
            if (FINAL_STATES.has(bl.statoEvento)) continue
            const r = results[i]!
            await updateBetLeg(betId, bl.id, {
              stake: r.hedgeStake,
              rischio: r.hedgeCost,
            })
          }
        } else if (puntaQuotaChanged) {
          const totalBackOdds =
            hedgeLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1) || (value as number)
          const backStakeTotale = puntaLeg.stake + (puntaLeg.bonusValore ?? 0)
          const eventsForCalc = hedgeLegs.map((l) => ({
            type: (l.metodo === 'banca' ? 'punta-banca' : 'punta-punta') as
              | 'punta-banca'
              | 'punta-punta',
            coverOdds: l.quota,
            commissionPercent: l.commissionePercentuale ?? (l.metodo === 'banca' ? 3 : 0),
          }))
          const results = multiplaLayStakes(
            backStakeTotale,
            totalBackOdds,
            eventsForCalc,
            puntaLeg.rimborsoValore ?? 0,
          )
          for (let i = 0; i < hedgeLegs.length; i++) {
            const bl = hedgeLegs[i]!
            if (FINAL_STATES.has(bl.statoEvento)) continue
            const r = results[i]!
            await updateBetLeg(betId, bl.id, {
              stake: r.hedgeStake,
              rischio: r.hedgeCost,
            })
          }
        } else if (puntaStakeChanged) {
          const backStakeTotale =
            field === 'stake'
              ? (value as number) + (puntaLeg.bonusValore ?? 0)
              : field === 'bonusValore'
                ? puntaLeg.stake + (value as number)
                : puntaLeg.stake + (puntaLeg.bonusValore ?? 0)
          const rimborso =
            field === 'rimborsoValore' ? (value as number) : (puntaLeg.rimborsoValore ?? 0)
          const totalBackOdds =
            hedgeLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1) || puntaLeg.quota
          const eventsForCalc = hedgeLegs.map((l) => ({
            type: (l.metodo === 'banca' ? 'punta-banca' : 'punta-punta') as
              | 'punta-banca'
              | 'punta-punta',
            coverOdds: l.quota,
            commissionPercent: l.commissionePercentuale ?? (l.metodo === 'banca' ? 3 : 0),
          }))
          const results = multiplaLayStakes(backStakeTotale, totalBackOdds, eventsForCalc, rimborso)
          for (let i = 0; i < hedgeLegs.length; i++) {
            const bl = hedgeLegs[i]!
            if (FINAL_STATES.has(bl.statoEvento)) continue
            const r = results[i]!
            await updateBetLeg(betId, bl.id, {
              stake: r.hedgeStake,
              rischio: r.hedgeCost,
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
      const patch: Record<string, unknown> = { tipoBonus }
      if (tipoBonus !== 'bonus') {
        patch.bonusValore = 0
      }
      if (tipoBonus !== 'rimborso') {
        patch.rimborsoValore = 0
      }
      await updateBetLeg(betId, legId, patch as Parameters<typeof updateBetLeg>[2])

      // Ricalcola coperture se è una multipla e il bonus è cambiato
      const puntaLeg = legs.find((l) => l.metodo === 'punta')
      const hedgeLegs = puntaLeg
        ? legs
            .filter((l) => l.id !== puntaLeg.id)
            .sort((a, b) => {
              const byDate = new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
              if (byDate !== 0) return byDate
              return String(a.id).localeCompare(String(b.id))
            })
        : []
      const isMultipla =
        hedgeLegs.length >= 2 &&
        puntaLeg != null &&
        !hedgeLegs.every(
          (l) =>
            l.eventoNome === hedgeLegs[0].eventoNome &&
            l.mercato === hedgeLegs[0].mercato &&
            l.selezione === hedgeLegs[0].selezione,
        )
      if (isMultipla && legId === puntaLeg.id) {
        const leg = legs.find((l) => l.id === legId)
        const oldBonus = leg?.bonusValore ?? 0
        const newBonus = tipoBonus !== 'bonus' ? 0 : oldBonus
        const newRimborso = tipoBonus === 'rimborso' ? (puntaLeg.rimborsoValore ?? 0) : 0
        const backStakeTotale = puntaLeg.stake + newBonus
        const totalBackOdds =
          hedgeLegs.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1) || puntaLeg.quota
        const eventsForCalc = hedgeLegs.map((l) => ({
          type: (l.metodo === 'banca' ? 'punta-banca' : 'punta-punta') as
            | 'punta-banca'
            | 'punta-punta',
          coverOdds: l.quota,
          commissionPercent: l.commissionePercentuale ?? (l.metodo === 'banca' ? 3 : 0),
        }))
        const results = multiplaLayStakes(
          backStakeTotale,
          totalBackOdds,
          eventsForCalc,
          newRimborso,
        )
        for (let i = 0; i < hedgeLegs.length; i++) {
          const bl = hedgeLegs[i]!
          const r = results[i]!
          await updateBetLeg(betId, bl.id, {
            stake: r.hedgeStake,
            rischio: r.hedgeCost,
          })
        }
      }

      // Sync modalitaSaldo on the bet when the punta leg's tipoBonus changes
      const puntaLegForSync = legs.find((l) => l.metodo === 'punta')
      if (puntaLegForSync && legId === puntaLegForSync.id) {
        const modalita =
          tipoBonus === 'bonus' || tipoBonus === 'freebet'
            ? 'bonus'
            : tipoBonus === 'rimborso'
              ? 'rimborso'
              : 'reale'
        await updateBet(betId, { modalitaSaldo: modalita as ModalitaSaldo })
      }

      await fetchBetWithLegs(betId)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? "Errore nell'aggiornamento del tipo bonus.")
    }
  }

  const handleAccountChange = async (legId: string, accountId: string) => {
    try {
      await updateBetLeg(betId, legId, { accountId })
      // Sync accountId on the bet when the punta leg's account changes
      const puntaLeg = legs.find((l) => l.metodo === 'punta')
      if (puntaLeg && legId === puntaLeg.id) {
        await updateBet(betId, { accountId })
      }
      await fetchBetWithLegs(betId)
      await fetchAllAccounts()
    } catch (err) {
      window.alert(getErrorMessage(err) ?? "Errore nell'assegnazione del conto.")
    }
  }

  const isLegEditable = (leg: BetLeg) => leg.statoEvento === 'bozza'
  const mainPuntaLeg = legs.find((l) => l.metodo === 'punta')
  const totalRischio = legs
    .filter((l) => l.id !== mainPuntaLeg?.id)
    .reduce((s, l) => s + (l.rischio ?? 0), 0)
  const totalMovimento = legs.reduce((s, l) => s + l.movimento, 0)
  const canEditField = (leg: BetLeg, field: EditableField) => {
    if (!isLegEditable(leg)) return false
    if (field === 'bonusValore') return leg.tipoBonus === 'bonus'
    if (field === 'rimborsoValore') return leg.tipoBonus === 'rimborso'
    return true
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
      return (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            inputMode="decimal"
            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={value}
            onChange={(e) => setDraftValue(sanitizeDecimal(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleConfirmEdit()
              if (e.key === 'Escape') handleCancelEdit()
            }}
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
              className="rounded p-0.5 text-amber-400 hover:bg-amber-500/15"
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
        className="rounded bg-neon-blue/10 px-1.5 py-0.5 text-left text-xs text-foreground ring-1 ring-neon-blue/20 hover:bg-neon-blue/20"
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
      return <span className="whitespace-nowrap text-xs text-muted-foreground">{displayValue}</span>
    }
    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={draftTextValue}
            onChange={(e) => setDraftTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleConfirmTextEdit()
              if (e.key === 'Escape') setEditingTextCell(null)
            }}
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
              className="rounded p-0.5 text-amber-400 hover:bg-amber-500/15"
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
        className="whitespace-nowrap rounded bg-neon-blue/10 px-1.5 py-0.5 text-left text-xs text-foreground ring-1 ring-neon-blue/20 hover:bg-neon-blue/20"
        onClick={() => handleStartTextEdit(leg.id, field, displayValue)}
      >
        {displayValue}
      </button>
    )
  }

  const canEditLegEventDate = (leg: BetLeg) => leg.statoEvento === 'bozza'

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
      </header>

      <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="text-muted-foreground">ID GIOCATA </span>
            <span className="font-mono text-foreground">{bet.id}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            {notaEditing ? (
              <>
                <input
                  type="text"
                  placeholder="Inserisci una nota"
                  className="w-full rounded-md border border-primary bg-background px-2 py-1.5 pr-8 text-sm ring-1 ring-primary/30"
                  value={notaLocal}
                  onChange={(e) => setNotaLocal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotaSave()}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-primary hover:bg-primary/10"
                  onClick={handleNotaSave}
                  title="Salva nota"
                >
                  <Check className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                onClick={() => setNotaEditing(true)}
              >
                <span className={notaLocal ? 'text-foreground' : 'text-muted-foreground'}>
                  {notaLocal || 'Inserisci una nota'}
                </span>
                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:w-auto">
            <span className="text-xs text-muted-foreground">Tag</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              value={bet.tag ?? ''}
              onChange={(e) => {
                void updateBet(bet.id, { tag: e.target.value || undefined })
              }}
            >
              {tagOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
            onClick={() => setDepositModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nuovo Deposito
          </button>
          <div className="sm:ml-auto" />
          <button
            type="button"
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium sm:w-auto ${hasLegsInCorso ? 'cursor-not-allowed opacity-50' : 'text-foreground hover:bg-muted'}`}
            onClick={handleArchive}
            disabled={hasLegsInCorso}
            title={
              hasLegsInCorso
                ? 'Non è possibile archiviare una giocata con scommesse in corso'
                : undefined
            }
          >
            <Archive className="h-4 w-4" />
            Archivia
          </button>
          <button
            type="button"
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/60 bg-transparent px-3 py-1.5 text-sm font-medium sm:w-auto ${hasLegsInCorso ? 'cursor-not-allowed text-destructive/50 opacity-50' : 'text-destructive hover:bg-destructive/10'}`}
            onClick={handleDeleteBet}
            disabled={hasLegsInCorso}
            title={
              hasLegsInCorso
                ? 'Non è possibile eliminare una giocata con scommesse in corso'
                : undefined
            }
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

      {/* Vista mobile: card per leg */}
      <div className="block space-y-4 sm:hidden">
        {legs.map((leg) => {
          const shouldHighlightLeg =
            Boolean(bet?.eventoNotificato && bet?.hasOpenLegs) ||
            (Boolean(leg.eventoNotificato) &&
              (leg.statoEvento === 'bozza' || leg.statoEvento === 'in_corso'))
          return (
            <div
              key={leg.id}
              className={`rounded-xl border border-border bg-card/70 p-4 shadow-sm ${
                shouldHighlightLeg ? 'bg-amber-500/10' : ''
              } ${leg.statoEvento !== 'bozza' ? 'opacity-75' : ''}`}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-2">
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {leg.metodo}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  {editingDateLegId === leg.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="datetime-local"
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        value={draftDateLocal}
                        onChange={(e) => setDraftDateLocal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleConfirmDateEdit()
                          if (e.key === 'Escape') handleCancelDateEdit()
                        }}
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={handleCancelDateEdit}
                          aria-label="Annulla"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-amber-400 hover:bg-amber-500/15"
                          onClick={() => void handleConfirmDateEdit()}
                          aria-label="Conferma"
                          disabled={!Number.isFinite(new Date(draftDateLocal).getTime())}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : canEditLegEventDate(leg) ? (
                    <button
                      type="button"
                      className="rounded bg-neon-blue/10 px-1.5 py-0.5 text-xs text-foreground ring-1 ring-neon-blue/20 hover:bg-neon-blue/20"
                      onClick={() => handleStartDateEdit(leg)}
                    >
                      {renderEventDateCell(leg.eventoData)}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {renderEventDateCell(leg.eventoData)}
                    </span>
                  )}
                </div>

                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Evento</span>
                    <span className="min-w-0 text-right text-foreground">
                      {renderEditableTextCell(leg, 'eventoNome', leg.eventoNome)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Competizione</span>
                    <span className="text-foreground">{leg.competizione}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Selezione</span>
                    <span className="text-right text-foreground">
                      {[leg.mercato, leg.selezione].filter(Boolean).join(' - ') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Tipo bonus</span>
                    {leg.metodo === 'punta' ? (
                      <select
                        value={leg.tipoBonus}
                        onChange={(e) =>
                          handleTipoBonusChange(leg.id, e.target.value as BetLeg['tipoBonus'])
                        }
                        disabled={leg.statoEvento !== 'bozza'}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-70"
                      >
                        {TIPO_BONUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Conto</span>
                    <SearchableSelect
                      options={leg.metodo === 'banca' ? bancaAccountOptions : puntaAccountOptions}
                      value={leg.accountId}
                      onChange={(value) => handleAccountChange(leg.id, value)}
                      placeholder="Seleziona conto"
                      searchPlaceholder="Cerca conto..."
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      disabled={leg.statoEvento !== 'bozza'}
                    />
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Stake</span>
                    {renderEditableCell(leg, 'stake', leg.stake, (v) => v.toFixed(2))}
                  </div>
                  {isMultipla ? (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Quota Punta</span>
                        {leg.metodo === 'punta' ? (
                          renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(3))
                        ) : leg.quotaRiferimento != null ? (
                          renderEditableCell(leg, 'quotaRiferimento', leg.quotaRiferimento, (v) =>
                            v.toFixed(3),
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Quota Banca</span>
                        {leg.metodo === 'banca' ? (
                          renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(3))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Quota</span>
                      {renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(3))}
                    </div>
                  )}
                  {leg.metodo === 'banca' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Com %</span>
                      {renderEditableCell(
                        leg,
                        'commissionePercentuale',
                        leg.commissionePercentuale ?? 0,
                        (v) => `${v.toFixed(1)}%`,
                      )}
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Rischio</span>
                    <span className="text-foreground">
                      {(leg.metodo === 'punta' && (leg.rischio ?? 0) === 0
                        ? leg.stake
                        : (leg.rischio ?? 0)
                      ).toFixed(2)}{' '}
                      €
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Bonus</span>
                    {renderEditableCell(leg, 'bonusValore', leg.bonusValore ?? 0, (v) =>
                      v !== 0 ? `${v.toFixed(2)} €` : '—',
                    )}
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Rimborso</span>
                    {renderEditableCell(leg, 'rimborsoValore', leg.rimborsoValore ?? 0, (v) =>
                      v !== 0 ? `${v.toFixed(2)} €` : '—',
                    )}
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Mov.</span>
                    <span className="font-mono font-medium text-foreground">
                      {leg.movimento.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-muted-foreground">Stato evento</span>
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
                  </div>
                  {leg.tag && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Tag</span>
                      <span className="text-foreground">{leg.tag}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-border/60 pt-3">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-border bg-muted/60 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={() => handleCloneLeg(leg)}
                  >
                    Clona
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                    onClick={() => handleDeleteLeg(leg.id)}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {legs.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
            Nessun esito registrato per questa giocata.
          </div>
        )}
      </div>

      {/* Vista desktop: tabella */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="whitespace-nowrap border-b border-border/60 bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Competizione</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">Selezione</th>
              <th className="px-3 py-2 text-left">Metodo</th>
              <th className="px-3 py-2 text-left">Tipo bonus</th>
              <th className="px-3 py-2 text-left">Conto</th>
              <th className="px-3 py-2 text-left">Stake</th>
              {isMultipla ? (
                <>
                  <th className="px-3 py-2 text-left">Quota Punta</th>
                  <th className="px-3 py-2 text-left">Quota Banca</th>
                </>
              ) : (
                <th className="px-3 py-2 text-left">Quota</th>
              )}
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
                Boolean(bet?.eventoNotificato && bet?.hasOpenLegs) ||
                (Boolean(leg.eventoNotificato) &&
                  (leg.statoEvento === 'bozza' || leg.statoEvento === 'in_corso'))

              return (
                <tr
                  key={leg.id}
                  className={`border-b border-border/40 align-top last:border-b-0 ${
                    shouldHighlightLeg ? 'bg-amber-500/10' : ''
                  } ${leg.statoEvento !== 'bozza' ? 'opacity-75' : ''}`}
                >
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {editingDateLegId === leg.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="datetime-local"
                          className="w-[11.5rem] rounded-md border border-border bg-background px-2 py-1 text-xs"
                          value={draftDateLocal}
                          onChange={(e) => setDraftDateLocal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleConfirmDateEdit()
                            if (e.key === 'Escape') handleCancelDateEdit()
                          }}
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
                            className="rounded p-0.5 text-amber-400 hover:bg-amber-500/15"
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
                        className="rounded bg-neon-blue/10 px-1.5 py-0.5 text-center text-xs text-foreground ring-1 ring-neon-blue/20 hover:bg-neon-blue/20"
                        onClick={() => handleStartDateEdit(leg)}
                        title="Modifica data evento"
                      >
                        {renderEventDateCell(leg.eventoData)}
                      </button>
                    ) : (
                      renderEventDateCell(leg.eventoData)
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {renderEditableTextCell(leg, 'eventoNome', leg.eventoNome)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {leg.competizione}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {[leg.mercato, leg.selezione].filter(Boolean).join(' - ') || '—'}
                  </td>
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
                        options={leg.metodo === 'banca' ? bancaAccountOptions : puntaAccountOptions}
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
                  {isMultipla ? (
                    <>
                      <td className="px-3 py-2">
                        {leg.metodo === 'punta' ? (
                          renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(3))
                        ) : leg.quotaRiferimento != null ? (
                          renderEditableCell(leg, 'quotaRiferimento', leg.quotaRiferimento, (v) =>
                            v.toFixed(3),
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {leg.metodo === 'banca' ? (
                          renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(3))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2">
                      {renderEditableCell(leg, 'quota', leg.quota, (v) => v.toFixed(3))}
                    </td>
                  )}
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
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-foreground">
                    {(leg.metodo === 'punta' && (leg.rischio ?? 0) === 0
                      ? leg.stake
                      : (leg.rischio ?? 0)
                    ).toFixed(2)}{' '}
                    €
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {renderEditableCell(leg, 'bonusValore', leg.bonusValore ?? 0, (v) =>
                      v !== 0 ? `${v.toFixed(2)} €` : '—',
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {renderEditableCell(leg, 'rimborsoValore', leg.rimborsoValore ?? 0, (v) =>
                      v !== 0 ? `${v.toFixed(2)} €` : '—',
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-medium text-foreground">
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

      <AccountMovementModal open={depositModalOpen} onOpenChange={setDepositModalOpen} />
    </section>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { sanitizeDecimal } from '@/lib/utils'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import type { BetBonusType, BetCategory, ModalitaSaldo, SportType } from '@/types/profit-tracker'

interface SingolaBetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SPORT_OPTIONS: { value: SportType; label: string }[] = [
  { value: 'calcio', label: 'Calcio' },
  { value: 'basket', label: 'Basket' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'altro', label: 'Altro' },
]

const TIPO_STAKE_OPTIONS: { value: BetBonusType; label: string }[] = [
  { value: 'none', label: 'Reale' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'rimborso', label: 'Rimborso' },
  { value: 'freebet', label: 'Freebet' },
]

const STAKE_LABEL: Record<BetBonusType, string> = {
  none: 'Stake reale (€)',
  bonus: 'Valore stake bonus (€)',
  rimborso: 'Valore stake rimborso (€)',
  freebet: 'Valore stake freebet (€)',
}

function modalitaSaldoFromTipoBonus(tipoBonus: BetBonusType): ModalitaSaldo {
  if (tipoBonus === 'bonus' || tipoBonus === 'freebet') return 'bonus'
  if (tipoBonus === 'rimborso') return 'rimborso'
  return 'reale'
}

function getDefaultEventDateTimeLocal(): string {
  const now = new Date()
  const withMinutes = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  )
  return withMinutes.toISOString().slice(0, 16)
}

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function SingolaBetModal({ open, onOpenChange }: SingolaBetModalProps) {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const allBooks = useProfitTrackerStore((s) => s.allBooks)
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [sport, setSport] = useState<SportType>('calcio')
  const [eventoNome, setEventoNome] = useState('')
  const [eventoDataLocal, setEventoDataLocal] = useState(getDefaultEventDateTimeLocal)
  const [mercato, setMercato] = useState('')
  const [selezione, setSelezione] = useState('')
  const [accountId, setAccountId] = useState('')
  const [quota, setQuota] = useState('')
  const [tipoBonus, setTipoBonus] = useState<BetBonusType>('none')
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [stake, setStake] = useState('')
  const [nota, setNota] = useState('')
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setSport('calcio')
    setEventoNome('')
    setEventoDataLocal(getDefaultEventDateTimeLocal())
    setMercato('')
    setSelezione('')
    setAccountId('')
    setQuota('')
    setTipoBonus('none')
    setCategoria('matched_betting')
    setStake('')
    setNota('')
    setIsSaving(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    void fetchAllAccounts()
    void fetchAllBooks()
    void fetchAllHolders()
  }, [open, fetchAllAccounts, fetchAllBooks, fetchAllHolders, resetState])

  const accountOptions = useMemo(
    () =>
      allAccounts.map((a) => {
        const book = allBooks.find((b) => b.id === a.bookId)
        const holder = allHolders.find((h) => h.id === a.holderId)
        const label = book && holder ? `${book.nome} (${holder.nome})` : a.nome
        return { value: a.id, label }
      }),
    [allAccounts, allBooks, allHolders],
  )

  const stakeNum = parseNum(stake)
  const quotaNum = parseNum(quota)

  const canSave = useMemo(() => {
    if (!eventoNome.trim()) return false
    if (!mercato.trim()) return false
    if (!eventoDataLocal) return false
    if (!accountId) return false
    if (stakeNum == null || stakeNum <= 0) return false
    if (quotaNum == null || quotaNum <= 1) return false
    return true
  }, [eventoNome, mercato, eventoDataLocal, accountId, stakeNum, quotaNum])

  const handleSave = useCallback(async () => {
    if (!canSave || stakeNum == null || quotaNum == null) return
    setIsSaving(true)
    setError(null)
    try {
      const eventoDataIso = new Date(eventoDataLocal).toISOString()
      const betPayload = {
        eventoData: eventoDataIso,
        categoria,
        sport,
        eventoNome,
        modalitaSaldo: modalitaSaldoFromTipoBonus(tipoBonus),
        accountId,
        tag: undefined as string | undefined,
        nota: nota.trim() ? nota.trim() : undefined,
      }

      const legPayload = {
        eventoData: eventoDataIso,
        sport,
        eventoNome,
        competizione: 'N/D',
        mercato,
        selezione: selezione.trim() ? selezione.trim() : undefined,
        metodo: 'punta' as const,
        tipoBonus,
        accountId,
        stake: stakeNum,
        quota: quotaNum,
        rischio: 0,
        commissionePercentuale: 0,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
        posizione: 0,
      }

      await saveOngoingBetFromCalculator(betPayload, [legPayload])
      resetState()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio della giocata')
    } finally {
      setIsSaving(false)
    }
  }, [
    canSave,
    stakeNum,
    quotaNum,
    eventoDataLocal,
    sport,
    eventoNome,
    tipoBonus,
    categoria,
    accountId,
    nota,
    mercato,
    selezione,
    saveOngoingBetFromCalculator,
    resetState,
    onOpenChange,
  ])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <div
          ref={setDropdownPortalEl}
          className="pointer-events-none fixed inset-0 z-[9998]"
          aria-hidden
        />
        <DialogHeader>
          <DialogTitle>Nuova giocata singola</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <SearchableSelect
            id="singola-sport"
            label="Sport"
            options={SPORT_OPTIONS}
            value={sport}
            onChange={(v) => setSport(v as SportType)}
            allowEmpty={false}
            size="sm"
            portalContainer={dropdownPortalEl}
          />

          <div className="space-y-1.5">
            <Label htmlFor="singola-evento">Squadra / evento</Label>
            <Input
              id="singola-evento"
              value={eventoNome}
              onChange={(e) => setEventoNome(e.target.value)}
              placeholder="Es. Juventus - Milan"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="singola-data">Data e ora disputa</Label>
            <Input
              id="singola-data"
              type="datetime-local"
              value={eventoDataLocal}
              onChange={(e) => setEventoDataLocal(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="singola-mercato">Mercato</Label>
            <Input
              id="singola-mercato"
              value={mercato}
              onChange={(e) => setMercato(e.target.value)}
              placeholder="Es. Esito finale 1X2"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="singola-selezione">Selezione (opzionale)</Label>
            <Input
              id="singola-selezione"
              value={selezione}
              onChange={(e) => setSelezione(e.target.value)}
              placeholder="Es. Over 2.5"
            />
          </div>

          <BetCategorySelect value={categoria} onChange={setCategoria} />

          <SearchableSelect
            id="singola-conto"
            label="Conto"
            placeholder="Seleziona conto"
            searchPlaceholder="Cerca conto..."
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
            allowEmpty={false}
            size="sm"
            portalContainer={dropdownPortalEl}
          />

          <div className="space-y-1.5">
            <Label htmlFor="singola-quota">Quota</Label>
            <Input
              id="singola-quota"
              type="text"
              inputMode="decimal"
              value={quota}
              onChange={(e) => setQuota(sanitizeDecimal(e.target.value))}
              placeholder="Es. 1.85"
            />
          </div>

          <SearchableSelect
            id="singola-tipo-stake"
            label="Tipo di stake"
            options={TIPO_STAKE_OPTIONS}
            value={tipoBonus}
            onChange={(v) => setTipoBonus(v as BetBonusType)}
            allowEmpty={false}
            size="sm"
            portalContainer={dropdownPortalEl}
          />

          <div className="space-y-1.5">
            <Label htmlFor="singola-stake">{STAKE_LABEL[tipoBonus]}</Label>
            <Input
              id="singola-stake"
              type="text"
              inputMode="decimal"
              value={stake}
              onChange={(e) => setStake(sanitizeDecimal(e.target.value))}
              placeholder="Es. 50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="singola-nota">Descrizione (opzionale)</Label>
            <textarea
              id="singola-nota"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Note sulla giocata, motivazione del value bet, ecc."
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annulla
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={!canSave || isSaving}>
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

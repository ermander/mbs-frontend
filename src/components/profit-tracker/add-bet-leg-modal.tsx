'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { calcolaMovimento } from '@/lib/profit-tracker/calcs'
import { sanitizeDecimal } from '@/lib/utils'
import type { SportType } from '@/types/profit-tracker'

const SPORTS: { value: SportType; label: string }[] = [
  { value: 'calcio', label: 'Calcio' },
  { value: 'basket', label: 'Basket' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'altro', label: 'Altro' },
]

interface AddBetLegModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  betId: string
  defaultMethod: 'punta' | 'banca'
  onSuccess: () => void
}

export function AddBetLegModal({
  open,
  onOpenChange,
  betId,
  defaultMethod,
  onSuccess,
}: AddBetLegModalProps) {
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.books)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const addBetLegs = useProfitTrackerStore((s) => s.addBetLegs)

  const bet = useMemo(() => ongoingBets.find((b) => b.id === betId), [ongoingBets, betId])

  const filteredAccounts = useMemo(
    () =>
      allAccounts.filter((a) => {
        const book = books.find((b) => b.id === a.bookId)
        if (!book) return false
        return defaultMethod === 'banca' ? book.isExchange : !book.isExchange
      }),
    [allAccounts, books, defaultMethod],
  )

  const [eventoData, setEventoData] = useState('')
  const [eventoNome, setEventoNome] = useState('')
  const [sport, setSport] = useState<SportType>('calcio')
  const [competizione, setCompetizione] = useState('')
  const [mercato, setMercato] = useState('')
  const [accountId, setAccountId] = useState('')
  const [stake, setStake] = useState('')
  const [quota, setQuota] = useState('')
  const [commissionePercentuale, setCommissionePercentuale] = useState('0')
  const [tag, setTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      void fetchAllAccounts()
      if (bet) {
        setEventoData(bet.eventoData.slice(0, 16))
        setEventoNome(bet.eventoNome)
        setSport(bet.sport)
      } else {
        const now = new Date()
        setEventoData(now.toISOString().slice(0, 16))
        setEventoNome('')
      }
      setCompetizione('')
      setMercato('')
      setAccountId('')
      setStake('')
      setQuota('')
      setCommissionePercentuale('0')
      setTag('')
    }
  }, [open, bet, fetchAllAccounts])

  const effectiveAccountId =
    accountId && filteredAccounts.some((a) => a.id === accountId)
      ? accountId
      : (filteredAccounts[0]?.id ?? '')

  const stakeNum = Number.parseFloat(stake.replace(',', '.'))
  const quotaNum = Number.parseFloat(quota.replace(',', '.'))
  const commNum = Number.parseFloat(commissionePercentuale.replace(',', '.')) || 0
  const movimento = useMemo(() => {
    if (!Number.isFinite(stakeNum) || !Number.isFinite(quotaNum) || stakeNum <= 0 || quotaNum <= 1)
      return 0
    return calcolaMovimento(stakeNum, quotaNum, commNum)
  }, [stakeNum, quotaNum, commNum])
  const rischio =
    defaultMethod === 'banca' &&
    Number.isFinite(stakeNum) &&
    Number.isFinite(quotaNum) &&
    quotaNum > 1
      ? Number((stakeNum * (quotaNum - 1)).toFixed(2))
      : 0

  const handleSubmit = async () => {
    if (!effectiveAccountId || !Number.isFinite(stakeNum) || !Number.isFinite(quotaNum)) return
    const dataIso = eventoData ? new Date(eventoData).toISOString() : new Date().toISOString()
    setIsSubmitting(true)
    try {
      await addBetLegs(betId, [
        {
          eventoData: dataIso,
          sport,
          eventoNome: eventoNome || 'Nuovo',
          competizione: competizione || '—',
          mercato: mercato || '—',
          metodo: defaultMethod,
          tipoBonus: 'none',
          accountId: effectiveAccountId,
          stake: stakeNum,
          quota: quotaNum,
          rischio,
          commissionePercentuale: commNum,
          movimento,
          statoEvento: 'bozza',
          tag: tag || undefined,
        },
      ])
      onSuccess()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSave =
    effectiveAccountId &&
    Number.isFinite(stakeNum) &&
    stakeNum > 0 &&
    Number.isFinite(quotaNum) &&
    quotaNum >= 1 &&
    eventoNome.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{defaultMethod === 'punta' ? 'Nuova Puntata' : 'Nuova Bancata'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-evento-data">Data evento</Label>
            <input
              id="add-leg-evento-data"
              type="datetime-local"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={eventoData}
              onChange={(e) => setEventoData(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-evento-nome">Evento</Label>
            <input
              id="add-leg-evento-nome"
              type="text"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              placeholder="es. Inter v Atalanta"
              value={eventoNome}
              onChange={(e) => setEventoNome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-sport">Sport</Label>
            <select
              id="add-leg-sport"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={sport}
              onChange={(e) => setSport(e.target.value as SportType)}
            >
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-competizione">Competizione</Label>
            <input
              id="add-leg-competizione"
              type="text"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              placeholder="es. Serie A"
              value={competizione}
              onChange={(e) => setCompetizione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-mercato">Mercato</Label>
            <input
              id="add-leg-mercato"
              type="text"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              placeholder="es. 1X2"
              value={mercato}
              onChange={(e) => setMercato(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-conto">Conto</Label>
            <select
              id="add-leg-conto"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveAccountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {filteredAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-leg-stake">Stake</Label>
              <input
                id="add-leg-stake"
                type="text"
                inputMode="decimal"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={stake}
                onChange={(e) => setStake(sanitizeDecimal(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-leg-quota">Quota</Label>
              <input
                id="add-leg-quota"
                type="text"
                inputMode="decimal"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={quota}
                onChange={(e) => setQuota(sanitizeDecimal(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-comm">Commissione %</Label>
            <input
              id="add-leg-comm"
              type="text"
              inputMode="decimal"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={commissionePercentuale}
              onChange={(e) => setCommissionePercentuale(sanitizeDecimal(e.target.value))}
            />
          </div>
          {movimento !== 0 && (
            <p className="text-xs text-muted-foreground">
              Movimento calcolato: {movimento.toFixed(2)} €
              {defaultMethod === 'banca' && rischio > 0 && ` · Rischio: ${rischio.toFixed(2)} €`}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="add-leg-tag">Tag (opzionale)</Label>
            <input
              id="add-leg-tag"
              type="text"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave || isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

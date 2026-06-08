'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X } from 'lucide-react'
import {
  ratingPercent,
  stakeBFromStakeA,
  stakeBFromStakeARimborso,
} from '@/lib/calculators/punta-punta'
import { loadHolderAccounts } from '@/lib/calculators/load-accounts'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { type CreateBetLegPayload } from '@/services/api/profit-tracker-client'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { Account, Holder } from '@/types/profit-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

const MERCATI_PUNTA_PUNTA = [
  '1X2 - 1',
  '1X2 - X',
  '1X2 - 2',
  'Under/Over 0.5 - Under',
  'Under/Over 0.5 - Over',
  'Under/Over 1.5 - Under',
  'Under/Over 1.5 - Over',
  'Under/Over 2.5 - Under',
  'Under/Over 2.5 - Over',
  'Under/Over 3.5 - Under',
  'Under/Over 3.5 - Over',
  'GG/NG - GG',
  'GG/NG - NG',
  'Doppia Chance - 1X',
  'Doppia Chance - X2',
  'Doppia Chance - 12',
  'Handicap',
  'Parziale/Finale',
  'Altro',
] as const

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatSigned(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

function defaultEventoData(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

export function PuntaPuntaCalculator() {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [puntataA, setPuntataA] = useState('')
  const [quotaA, setQuotaA] = useState('')
  const [quotaB, setQuotaB] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [imbalance, setImbalance] = useState<number>(0)
  const [partialPuntas, setPartialPuntas] = useState<{ amount: string; newOdds: string }[]>([])
  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [isLoadingBasics, setIsLoadingBasics] = useState(false)
  const [holderIdPuntaA, setHolderIdPuntaA] = useState('')
  const [holderIdPuntaB, setHolderIdPuntaB] = useState('')
  const [accountsPuntaA, setAccountsPuntaA] = useState<Account[]>([])
  const [accountsPuntaB, setAccountsPuntaB] = useState<Account[]>([])
  const [accountIdPuntaA, setAccountIdPuntaA] = useState('')
  const [accountIdPuntaB, setAccountIdPuntaB] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [eventoNome, setEventoNome] = useState('')
  const [mercatoPuntaA, setMercatoPuntaA] = useState('')
  const [mercatoPuntaB, setMercatoPuntaB] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const puntataANum = parseNum(puntataA)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettivaA = (puntataANum ?? 0) + bonusNum
  const quotaANum = parseNum(quotaA)
  const quotaBNum = parseNum(quotaB)

  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))
  const imbalanceFactor = 1 + imbalancePercent / 100

  const stakeB = useMemo(() => {
    if (puntataEffettivaA <= 0 || quotaANum == null || quotaBNum == null) return null
    let base: number | null
    if (rimborsoNum > 0) {
      base = stakeBFromStakeARimborso(puntataEffettivaA, quotaANum, quotaBNum, rimborsoNum)
    } else {
      base = stakeBFromStakeA(puntataEffettivaA, quotaANum, quotaBNum)
    }
    if (base == null) return null
    const adjusted = base * imbalanceFactor
    return Number.isFinite(adjusted) ? adjusted : null
  }, [puntataEffettivaA, quotaANum, quotaBNum, rimborsoNum, imbalanceFactor])

  /* ── Contropuntata parziale (multi-step, max 6) ── */
  const partialPuntaResults = useMemo(() => {
    if (partialPuntas.length === 0 || quotaBNum == null || stakeB == null) return []

    const coverageTarget = stakeB * quotaBNum

    type StepResult = { newStake: number }
    const results: (StepResult | null)[] = []
    let coveredSum = 0

    for (let i = 0; i < partialPuntas.length; i++) {
      const amountNum = parseNum(partialPuntas[i].amount)
      const newOddsNum = parseNum(partialPuntas[i].newOdds)

      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break
      }

      const prevOdds = i === 0 ? quotaBNum : parseNum(partialPuntas[i - 1].newOdds)
      if (prevOdds == null) {
        results.push(null)
        break
      }

      coveredSum += amountNum * prevOdds

      if (newOddsNum <= 0) {
        results.push(null)
        break
      }

      const newStake = (coverageTarget - coveredSum) / newOddsNum
      if (!Number.isFinite(newStake) || newStake < 0) {
        results.push(null)
        break
      }

      results.push({ newStake })
    }

    return results
  }, [partialPuntas, quotaBNum, stakeB])

  const hasValidPartialPuntas =
    partialPuntas.length > 0 &&
    partialPuntaResults.length > 0 &&
    partialPuntaResults.every((r) => r != null)

  const partialPuntaTotals = useMemo(() => {
    if (!hasValidPartialPuntas || quotaBNum == null || stakeB == null) return null

    let totalStakeB = 0

    for (let i = 0; i < partialPuntas.length; i++) {
      const amount = parseNum(partialPuntas[i].amount)
      if (amount == null || amount <= 0) return null
      totalStakeB += amount
    }

    const lastResult = partialPuntaResults[partialPuntaResults.length - 1]
    if (lastResult == null) return null
    totalStakeB += lastResult.newStake

    return { totalStakeB }
  }, [hasValidPartialPuntas, partialPuntas, partialPuntaResults, quotaBNum, stakeB])

  // Effective stakeB: use partial totals if available
  const effectiveStakeB = partialPuntaTotals?.totalStakeB ?? stakeB

  const rating = useMemo(() => {
    if (quotaANum == null || quotaBNum == null || quotaANum <= 0 || quotaBNum <= 0) return null
    return ratingPercent(quotaANum, quotaBNum)
  }, [quotaANum, quotaBNum])

  const showSummary =
    puntataEffettivaA > 0 &&
    quotaANum != null &&
    quotaANum > 0 &&
    quotaBNum != null &&
    quotaBNum > 0 &&
    stakeB != null

  const showRimborsoColumn = rimborsoNum > 0

  const loadAccountsForHolder = useCallback((holderId: string) => loadHolderAccounts(holderId), [])

  const handleChangeHolderPuntaA = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaA(holderId)
      setAccountsPuntaA([])
      setAccountIdPuntaA('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaA(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  const handleChangeHolderPuntaB = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaB(holderId)
      setAccountsPuntaB([])
      setAccountIdPuntaB('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaB(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  useEffect(() => {
    if (!holderModalOpen || savedBetId) return
    const loadBasics = async () => {
      setIsLoadingBasics(true)
      try {
        if (holders.length === 0) await fetchHolders()
        if (books.length === 0) await fetchAllBooks()
      } finally {
        setIsLoadingBasics(false)
      }
    }
    void loadBasics()
  }, [holderModalOpen, savedBetId, holders.length, books.length, fetchHolders, fetchAllBooks])

  const resetModalState = useCallback(() => {
    setHolderIdPuntaA('')
    setHolderIdPuntaB('')
    setAccountsPuntaA([])
    setAccountsPuntaB([])
    setAccountIdPuntaA('')
    setAccountIdPuntaB('')
    setHolderModalError(null)
    setSavedBetId(null)
  }, [])

  const handleOpenModal = () => {
    resetModalState()
    setEventoData(defaultEventoData())
    setHolderModalOpen(true)
  }

  const realOutlay = (puntataANum ?? 0) + (effectiveStakeB ?? 0)
  const profitIfAWins =
    quotaANum != null && effectiveStakeB != null ? puntataEffettivaA * quotaANum - realOutlay : null
  const profitIfBWins =
    effectiveStakeB != null && quotaBNum != null
      ? effectiveStakeB * quotaBNum - realOutlay + rimborsoNum
      : null
  const returnA = quotaANum != null ? puntataEffettivaA * quotaANum : null
  const returnB = effectiveStakeB != null && quotaBNum != null ? effectiveStakeB * quotaBNum : null

  const guadagnoMinimo = useMemo(() => {
    if (profitIfAWins == null || profitIfBWins == null) return null
    const minVal = Math.min(profitIfAWins, profitIfBWins)
    return Number.isFinite(minVal) ? minVal : null
  }, [profitIfAWins, profitIfBWins])

  const crPercent =
    rimborsoNum > 0 && guadagnoMinimo != null && Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / rimborsoNum) * 100
      : null

  // Partial punta helpers
  const addPartialPunta = () => {
    if (partialPuntas.length < 6) {
      setPartialPuntas((prev) => [...prev, { amount: '', newOdds: '' }])
    }
  }
  const removePartialPunta = (index: number) => {
    setPartialPuntas((prev) => prev.filter((_, i) => i !== index))
  }
  const updatePartialPunta = (index: number, field: 'amount' | 'newOdds', value: string) => {
    setPartialPuntas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const canSave = useMemo(() => {
    if (!eventoNome.trim()) return false
    if (!accountIdPuntaA || !accountIdPuntaB) return false
    if (
      puntataEffettivaA <= 0 ||
      quotaANum == null ||
      quotaBNum == null ||
      stakeB == null ||
      guadagnoMinimo == null
    )
      return false
    return true
  }, [
    eventoNome,
    accountIdPuntaA,
    accountIdPuntaB,
    puntataEffettivaA,
    quotaANum,
    quotaBNum,
    stakeB,
    guadagnoMinimo,
  ])

  const handleSendToProfitTracker = async () => {
    if (!canSave) return
    if (quotaANum == null || quotaBNum == null || stakeB == null) return
    const eventoDataIso = new Date(eventoData).toISOString()
    const eventoNomeVal = eventoNome.trim() || 'Punta-Punta'
    const competizione = 'N/D'
    setIsSaving(true)
    setHolderModalError(null)
    try {
      const betPayload = {
        eventoData: eventoDataIso,
        sport: 'calcio' as const,
        eventoNome: eventoNomeVal,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPuntaA,
        tag: undefined as string | undefined,
        nota: undefined as string | undefined,
      }
      const tipoBonusA = rimborsoNum > 0 ? 'rimborso' : bonusNum > 0 ? 'bonus' : 'none'

      const legA: CreateBetLegPayload = {
        eventoData: eventoDataIso,
        sport: 'calcio',
        eventoNome: eventoNomeVal,
        competizione,
        mercato: mercatoPuntaA || '\u2014',
        metodo: 'punta' as const,
        tipoBonus: tipoBonusA as 'none' | 'bonus' | 'rimborso' | 'freebet',
        accountId: accountIdPuntaA,
        stake: puntataEffettivaA,
        quota: quotaANum,
        rischio: 0,
        bonusValore: bonusNum > 0 ? bonusNum : undefined,
        rimborsoValore: rimborsoNum > 0 ? rimborsoNum : undefined,
        commissionePercentuale: 0,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
        posizione: 0,
      }

      // Build leg B — split into multiple legs if partial counter-bets are active
      const legsB: CreateBetLegPayload[] = []
      if (hasValidPartialPuntas && partialPuntaResults.every((r) => r != null)) {
        for (let i = 0; i < partialPuntas.length; i++) {
          const amount = parseNum(partialPuntas[i].amount)
          const odds = i === 0 ? quotaBNum : parseNum(partialPuntas[i - 1].newOdds)
          if (amount == null || odds == null) break
          legsB.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: mercatoPuntaB || '\u2014',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaB,
            stake: amount,
            quota: odds,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: i + 1,
          })
        }
        // Add the final calculated remaining stake
        const lastResult = partialPuntaResults[partialPuntaResults.length - 1]
        const lastNewOdds = parseNum(partialPuntas[partialPuntas.length - 1].newOdds)
        if (lastResult != null && lastNewOdds != null) {
          legsB.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: mercatoPuntaB || '\u2014',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaB,
            stake: lastResult.newStake,
            quota: lastNewOdds,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: partialPuntas.length + 1,
          })
        }
      } else {
        legsB.push({
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome: eventoNomeVal,
          competizione,
          mercato: mercatoPuntaB || '\u2014',
          metodo: 'punta' as const,
          tipoBonus: 'none',
          accountId: accountIdPuntaB,
          stake: stakeB,
          quota: quotaBNum,
          rischio: 0,
          bonusValore: undefined,
          rimborsoValore: undefined,
          commissionePercentuale: 0,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
          posizione: 1,
        })
      }

      const legsPayload: CreateBetLegPayload[] = [legA, ...legsB]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setHolderModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sezione input */}
      <div className="border-b border-border bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntata-a">Puntata A</Label>
            <div className="relative">
              <Input
                id="puntata-a"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={puntataA}
                onChange={(e) => setPuntataA(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-a">Quota Punta A</Label>
            <div className="relative">
              <Input
                id="quota-a"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaA}
                onChange={(e) => setQuotaA(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="quota-b">Quota Punta B</Label>
            <div className="relative">
              <Input
                id="quota-b"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaB}
                onChange={(e) => setQuotaB(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus">Saldo bonus (opz.)</Label>
            <div className="relative">
              <Input
                id="bonus"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rimborso">Valore rimborso</Label>
            <div className="relative">
              <Input
                id="rimborso"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={rimborso}
                onChange={(e) => setRimborso(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slider Sbilanciamento (-30% … +30%) */}
      <div className="calc-advanced border-b border-border p-4">
        <Label className="mb-2 block">Sbilanciamento della Puntata B</Label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">−30%</span>
          <Slider
            value={[imbalance]}
            onValueChange={([v]) => setImbalance(v ?? 0)}
            min={-30}
            max={30}
            step={0.2}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">+30%</span>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {imbalance === 0
            ? 'Standard (0%)'
            : imbalance > 0
              ? `+${Number.isInteger(imbalance) ? imbalance : imbalance.toFixed(1)}%`
              : `${Number.isInteger(imbalance) ? imbalance : imbalance.toFixed(1)}%`}
        </p>
      </div>

      {/* Riepilogo */}
      {showSummary && guadagnoMinimo != null && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {bonusNum > 0 && rimborsoNum > 0
              ? 'BONUS + RIMBORSO \u2022 '
              : bonusNum > 0
                ? 'BONUS \u2022 '
                : rimborsoNum > 0
                  ? 'RIMBORSO \u2022 '
                  : ''}
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>
              {rimborsoNum > 0 && crPercent != null
                ? `CR%: ${crPercent.toFixed(2)}%`
                : `Rating: ${rating != null ? rating.toFixed(2) : '\u2014'}%`}
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">
                {formatNum(puntataEffettivaA)} €
              </span>
              {bonusNum > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (di cui {formatNum(bonusNum)} € bonus)
                </span>
              )}{' '}
              a quota <span className="font-mono">{formatNum(quotaANum)}</span> sul Book A.
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">{formatNum(stakeB)} €</span> a
              quota <span className="font-mono">{formatNum(quotaBNum)}</span> sul Book B.
            </p>
            {hasValidPartialPuntas && partialPuntaTotals != null && (
              <p>
                <span className="font-medium text-primary">Nuova Puntata B totale:</span>{' '}
                <span className="font-mono text-primary">
                  {formatNum(partialPuntaTotals.totalStakeB)} €
                </span>
              </p>
            )}
            <p>
              Il guadagno minimo sarà{' '}
              <span
                className={cn(
                  'font-mono',
                  guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive',
                )}
              >
                {formatSigned(guadagnoMinimo)} €
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tabella dei profitti */}
      {showSummary &&
        returnA != null &&
        returnB != null &&
        profitIfAWins != null &&
        profitIfBWins != null && (
          <div className="calc-advanced border-b border-border bg-card">
            <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              {bonusNum > 0 && rimborsoNum > 0
                ? 'BONUS + RIMBORSO \u2022 '
                : bonusNum > 0
                  ? 'BONUS \u2022 '
                  : rimborsoNum > 0
                    ? 'RIMBORSO \u2022 '
                    : ''}
              Tabella dei profitti
            </div>

            {/* Layout a card solo su mobile (< sm) */}
            <div className="block space-y-3 p-4 sm:hidden">
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book A:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}{' '}
                      €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-destructive">
                      {formatSigned(-(effectiveStakeB ?? 0))} €
                    </span>
                  </div>
                  {showRimborsoColumn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rimborso</span>
                      <span className="text-muted-foreground">{formatSigned(0)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfAWins)} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book B:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-primary">
                      {formatSigned((returnB ?? 0) - (effectiveStakeB ?? 0))} €
                    </span>
                  </div>
                  {showRimborsoColumn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rimborso</span>
                      <span className="text-primary">{formatSigned(rimborsoNum)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfBWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfBWins)} €
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella da sm in su */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[40%] p-3 text-left font-normal'
                          : 'w-[50%] p-3 text-left font-normal'
                      }
                    ></th>
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[14%] p-3 text-right font-normal'
                          : 'w-[16%] p-3 text-right font-normal'
                      }
                    >
                      Book A
                    </th>
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[14%] p-3 text-right font-normal'
                          : 'w-[16%] p-3 text-right font-normal'
                      }
                    >
                      Book B
                    </th>
                    {showRimborsoColumn && (
                      <th className="w-[14%] p-3 text-right font-normal">Rimborso</th>
                    )}
                    <th className="w-[18%] min-w-[5.5rem] p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book A:</td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(effectiveStakeB ?? 0))}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-muted-foreground">{formatSigned(0)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfAWins)} €
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book B:</td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned((returnB ?? 0) - (effectiveStakeB ?? 0))}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-primary">{formatSigned(rimborsoNum)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfBWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfBWins)} €
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Contropuntata parziale (multi-step) */}
      {stakeB != null && (
        <div className="calc-advanced border-b border-border p-4">
          <div className="space-y-3">
            {partialPuntas.map((pp, i) => {
              const result = partialPuntaResults[i] ?? null
              return (
                <div key={i} className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Contropuntata parziale {partialPuntas.length > 1 ? `#${i + 1}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePartialPunta(i)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`partial-amount-${i}`} className="text-xs sm:text-sm">
                        Già puntato €
                      </Label>
                      <Input
                        id={`partial-amount-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pp.amount}
                        onChange={(e) => updatePartialPunta(i, 'amount', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`partial-odds-${i}`} className="text-xs sm:text-sm">
                        Nuova quota punta B
                      </Label>
                      <Input
                        id={`partial-odds-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pp.newOdds}
                        onChange={(e) => updatePartialPunta(i, 'newOdds', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                  </div>
                  {result != null && (
                    <div className="mt-3 rounded-lg bg-background/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Nuova puntata B
                      </p>
                      <p className="font-mono text-sm font-semibold text-primary">
                        {formatNum(result.newStake)} €
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {partialPuntas.length < 6 && (
              <button
                type="button"
                onClick={addPartialPunta}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span className="text-base leading-none">+</span>
                Contropuntata parziale
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invia al Profit Tracker */}
      <div className="calc-advanced flex flex-col items-center gap-2 p-4">
        <Button onClick={handleOpenModal} variant="default" disabled={!showSummary}>
          Invia al Profit Tracker
        </Button>
      </div>

      {/* Modale: Assegna intestatari e dati evento */}
      <Dialog
        open={holderModalOpen}
        onOpenChange={(open) => {
          setHolderModalOpen(open)
          if (!open) resetModalState()
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0" showClose={true}>
          <div
            ref={setDropdownPortalEl}
            className="pointer-events-none fixed inset-0 z-[9998]"
            aria-hidden
          />
          {savedBetId ? (
            <>
              <div className="px-6 pb-4 pt-6">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Giocata salvata
                </DialogTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  La giocata è stata salvata correttamente nel Profit Tracker.
                </p>
                <p className="mt-3 text-sm text-foreground">
                  <Link
                    href={`/profit-tracker/giocate-in-corso/${savedBetId}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Vai al dettaglio della giocata
                  </Link>
                </p>
              </div>
              <div className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setHolderModalOpen(false)
                    setSavedBetId(null)
                  }}
                >
                  Chiudi
                </Button>
              </div>
            </>
          ) : isLoadingBasics ? (
            <>
              <DialogTitle className="sr-only">Caricamento</DialogTitle>
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pb-1 pt-6">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Salva giocata Punta-Punta
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Compila i dettagli dell&apos;evento e assegna gli intestatari per puntata 1 e
                  puntata 2.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-evento">Nome evento</Label>
                  <Input
                    id="pp-modal-evento"
                    type="text"
                    placeholder="Es. Juventus - Milan"
                    value={eventoNome}
                    onChange={(e) => setEventoNome(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-data">Data e ora evento</Label>
                  <Input
                    id="pp-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-mercato-a">Mercato Punta 1</Label>
                  <select
                    id="pp-modal-mercato-a"
                    value={mercatoPuntaA}
                    onChange={(e) => setMercatoPuntaA(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                  >
                    <option value="">Seleziona</option>
                    {MERCATI_PUNTA_PUNTA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-mercato-b">Mercato Punta 2</Label>
                  <select
                    id="pp-modal-mercato-b"
                    value={mercatoPuntaB}
                    onChange={(e) => setMercatoPuntaB(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                  >
                    <option value="">Seleziona</option>
                    {MERCATI_PUNTA_PUNTA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                      Intestatario Punta 1
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-a"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaA}
                      onChange={(val) => void handleChangeHolderPuntaA(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Conto punta 1</Label>
                    <SearchableSelect
                      id="account-punta-a"
                      placeholder={
                        holderIdPuntaA ? 'Seleziona conto' : 'Seleziona prima un intestatario'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaA.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaA}
                      onChange={setAccountIdPuntaA}
                      disabled={!holderIdPuntaA || accountsPuntaA.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaA && accountsPuntaA.length === 0 && (
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                        Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta 2
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-b"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaB}
                      onChange={(val) => void handleChangeHolderPuntaB(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Conto punta 2 (copertura)
                    </Label>
                    <SearchableSelect
                      id="account-punta-b"
                      placeholder={
                        holderIdPuntaB ? 'Seleziona conto' : 'Seleziona prima un intestatario'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaB.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaB}
                      onChange={setAccountIdPuntaB}
                      disabled={!holderIdPuntaB || accountsPuntaB.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaB && accountsPuntaB.length === 0 && (
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                        Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                </div>

                {showSummary && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Riepilogo importi</p>
                    <p className="mt-1">
                      Punta 1: <span className="font-mono">{puntataEffettivaA.toFixed(2)} €</span> a
                      quota <span className="font-mono">{quotaANum?.toFixed(2)}</span>
                    </p>
                    {hasValidPartialPuntas && partialPuntaResults.every((r) => r != null) ? (
                      <>
                        {partialPuntas.map((pp, i) => {
                          const amount = parseNum(pp.amount)
                          const odds = i === 0 ? quotaBNum : parseNum(partialPuntas[i - 1].newOdds)
                          return (
                            <p key={i}>
                              Punta 2.{i + 1} (copertura):{' '}
                              <span className="font-mono">{(amount ?? 0).toFixed(2)} €</span> a
                              quota <span className="font-mono">{(odds ?? 0).toFixed(2)}</span>
                            </p>
                          )
                        })}
                        {(() => {
                          const lastResult = partialPuntaResults[partialPuntaResults.length - 1]
                          const lastOdds = parseNum(partialPuntas[partialPuntas.length - 1].newOdds)
                          return lastResult != null && lastOdds != null ? (
                            <p>
                              Punta 2.{partialPuntas.length + 1} (copertura):{' '}
                              <span className="font-mono">{lastResult.newStake.toFixed(2)} €</span>{' '}
                              a quota <span className="font-mono">{lastOdds.toFixed(2)}</span>
                            </p>
                          ) : null
                        })()}
                      </>
                    ) : (
                      <p>
                        Punta 2 (copertura):{' '}
                        <span className="font-mono">{(stakeB ?? 0).toFixed(2)} €</span> a quota{' '}
                        <span className="font-mono">{quotaBNum?.toFixed(2)}</span>.
                      </p>
                    )}
                    {guadagnoMinimo != null && (
                      <p>
                        Guadagno minimo:{' '}
                        <span className="font-mono">{formatSigned(guadagnoMinimo)} €</span>
                      </p>
                    )}
                  </div>
                )}

                {holderModalError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {holderModalError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row">
                <Button
                  variant="outline"
                  className="sm:min-w-[100px]"
                  onClick={() => setHolderModalOpen(false)}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annulla
                </Button>
                <Button
                  variant="success"
                  className="sm:min-w-[120px]"
                  onClick={() => void handleSendToProfitTracker()}
                  disabled={isSaving || !canSave}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Salva nel Profit Tracker
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

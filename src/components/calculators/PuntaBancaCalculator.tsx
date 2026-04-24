'use client'

import React, { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  equivalentBackOdds,
  getImbalanceFactor,
  liability,
  layStakeRimborso,
  ratingPercent,
} from '@/lib/calculators/punta-banca'
import { PuntaBancaSaveModal } from '@/components/calculators/PuntaBancaSaveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

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

export function PuntaBancaCalculator() {
  const [puntata, setPuntata] = useState('')
  const [quotaPunta, setQuotaPunta] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [commissione, setCommissione] = useState('0')
  const [quotaBanca, setQuotaBanca] = useState('')
  const [imbalance, setImbalance] = useState<number>(0)
  const [partialLays, setPartialLays] = useState<{ amount: string; newOdds: string }[]>([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)
  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))

  const quotaPuntaEquivalente = useMemo(() => {
    if (quotaBancaNum == null) return null
    return equivalentBackOdds(quotaBancaNum, commissioneNum)
  }, [quotaBancaNum, commissioneNum])

  // Formula unica: (puntataEffettiva * quotaPunta - rimborso) / (quotaBanca - comm%)
  // Quando rimborso=0 → formula standard. Quando bonus=0 → formula rimborso pura.
  const layStakeValue = useMemo(() => {
    if (puntataEffettiva <= 0 || quotaPuntaNum == null || quotaBancaNum == null) return null
    const base = layStakeRimborso(
      puntataEffettiva,
      quotaPuntaNum,
      rimborsoNum,
      quotaBancaNum,
      commissioneNum,
    )
    if (base == null) return null
    const factor = getImbalanceFactor(imbalancePercent)
    const adjusted = base * factor
    return Number.isFinite(adjusted) ? adjusted : null
  }, [
    puntataEffettiva,
    rimborsoNum,
    quotaPuntaNum,
    quotaBancaNum,
    commissioneNum,
    imbalancePercent,
  ])

  const responsabilita = useMemo(() => {
    if (layStakeValue == null || quotaBancaNum == null) return null
    return liability(layStakeValue, quotaBancaNum)
  }, [layStakeValue, quotaBancaNum])

  /* ── Bancata parziale (multi-step, max 6) ── */
  const partialLayResults = useMemo(() => {
    if (
      partialLays.length === 0 ||
      quotaPuntaNum == null ||
      quotaBancaNum == null ||
      layStakeValue == null
    )
      return []

    const c = commissioneNum / 100
    const coverageTarget = layStakeValue * (quotaBancaNum - c)

    type StepResult = { newLayStake: number; newLiability: number }
    const results: (StepResult | null)[] = []
    let coveredSum = 0

    for (let i = 0; i < partialLays.length; i++) {
      const amountNum = parseNum(partialLays[i].amount)
      const newOddsNum = parseNum(partialLays[i].newOdds)

      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break
      }

      const prevOdds = i === 0 ? quotaBancaNum : parseNum(partialLays[i - 1].newOdds)
      if (prevOdds == null) {
        results.push(null)
        break
      }

      coveredSum += amountNum * (prevOdds - c)

      const denominator = newOddsNum - c
      if (denominator <= 0) {
        results.push(null)
        break
      }

      const newLayStake = (coverageTarget - coveredSum) / denominator
      if (!Number.isFinite(newLayStake) || newLayStake < 0) {
        results.push(null)
        break
      }

      const newLiability = newLayStake * (newOddsNum - 1)
      results.push({ newLayStake, newLiability })
    }

    return results
  }, [partialLays, quotaPuntaNum, quotaBancaNum, layStakeValue, commissioneNum])

  const hasValidPartialLays =
    partialLays.length > 0 &&
    partialLayResults.length > 0 &&
    partialLayResults.every((r) => r != null)

  const partialLayTotals = useMemo(() => {
    if (!hasValidPartialLays || quotaBancaNum == null) return null

    const c = commissioneNum / 100
    let totalLiability = 0
    let totalLayStake = 0

    for (let i = 0; i < partialLays.length; i++) {
      const amount = parseNum(partialLays[i].amount)
      if (amount == null || amount <= 0) return null
      const odds = i === 0 ? quotaBancaNum : parseNum(partialLays[i - 1].newOdds)
      if (odds == null) return null
      totalLiability += amount * (odds - 1)
      totalLayStake += amount
    }

    const lastResult = partialLayResults[partialLayResults.length - 1]
    if (lastResult == null) return null
    totalLiability += lastResult.newLiability
    totalLayStake += lastResult.newLayStake

    const totalExchangeProfit = Math.round(totalLayStake * (1 - c) * 100) / 100
    totalLiability = Math.round(totalLiability * 100) / 100

    return { totalLiability, totalExchangeProfit, totalLayStake }
  }, [hasValidPartialLays, partialLays, partialLayResults, quotaBancaNum, commissioneNum])

  // Effective values: use partial lay totals if available
  const effectiveLiability = partialLayTotals?.totalLiability ?? responsabilita
  const singleExchangeProfit = useMemo(() => {
    if (layStakeValue == null) return null
    return layStakeValue * (1 - commissioneNum / 100)
  }, [layStakeValue, commissioneNum])
  const effectiveExchangeProfit = partialLayTotals?.totalExchangeProfit ?? singleExchangeProfit

  const rating = useMemo(() => {
    if (puntataEffettiva <= 0 || layStakeValue == null) return null
    return ratingPercent(puntataEffettiva, layStakeValue)
  }, [puntataEffettiva, layStakeValue])

  /** Totale se vinci la puntata sul Book */
  const totalSeVinciPuntata = useMemo(() => {
    if (puntataNum == null || quotaPuntaNum == null || effectiveLiability == null) return null
    // Book profit: puntataEffettiva * quotaPunta - puntataNum (bonus vinto, reale restituito)
    // Exchange loss: -effectiveLiability
    // Rimborso: 0 (non si ottiene se la puntata vince)
    return puntataEffettiva * quotaPuntaNum - puntataNum - effectiveLiability
  }, [puntataNum, puntataEffettiva, quotaPuntaNum, effectiveLiability])

  /** Totale se vinci la bancata sull'Exchange */
  const totalSeVinciBancata = useMemo(() => {
    if (effectiveExchangeProfit == null) return null
    // Book loss: -puntataNum (perdi solo saldo reale)
    // Exchange profit: +effectiveExchangeProfit
    // Rimborso: +rimborsoNum
    return -(puntataNum ?? 0) + effectiveExchangeProfit + rimborsoNum
  }, [puntataNum, rimborsoNum, effectiveExchangeProfit])

  const guadagnoMinimo = useMemo(() => {
    if (totalSeVinciPuntata == null || totalSeVinciBancata == null) return null
    const minGainValue = Math.min(totalSeVinciPuntata, totalSeVinciBancata)
    return Number.isFinite(minGainValue) ? minGainValue : null
  }, [totalSeVinciPuntata, totalSeVinciBancata])

  const crPercent =
    rimborsoNum > 0 && guadagnoMinimo != null && Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / rimborsoNum) * 100
      : null

  const showSummary =
    puntataEffettiva > 0 &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    layStakeValue != null &&
    responsabilita != null

  const canOpenSaveModal =
    showSummary &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    layStakeValue != null &&
    responsabilita != null &&
    puntataEffettiva > 0

  // Partial lay helpers
  const addPartialLay = () => {
    if (partialLays.length < 6) {
      setPartialLays((prev) => [...prev, { amount: '', newOdds: '' }])
    }
  }
  const removePartialLay = (index: number) => {
    setPartialLays((prev) => prev.filter((_, i) => i !== index))
  }
  const updatePartialLay = (index: number, field: 'amount' | 'newOdds', value: string) => {
    setPartialLays((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const showRimborsoColumn = rimborsoNum > 0

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sezione Puntata */}
      <div className="border-b border-border bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntata">Puntata (saldo reale)</Label>
            <div className="relative">
              <Input
                id="puntata"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={puntata}
                onChange={(e) => setPuntata(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-punta">Quota Punta</Label>
            <div className="relative">
              <Input
                id="quota-punta"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={quotaPunta}
                onChange={(e) => setQuotaPunta(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus">Puntata bonus</Label>
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

      {/* Sezione Banca */}
      <div className="border-b border-border bg-destructive/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commissione">Commissione</Label>
            <div className="relative">
              <Input
                id="commissione"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={commissione}
                onChange={(e) => setCommissione(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-banca">Quota Banca</Label>
            <div className="relative">
              <Input
                id="quota-banca"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={quotaBanca}
                onChange={(e) => setQuotaBanca(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="quota-punta-equiv">Quota Punta Equivalente</Label>
          <div className="relative">
            <Input
              id="quota-punta-equiv"
              readOnly
              aria-readonly
              value={formatNum(quotaPuntaEquivalente)}
              className="bg-muted/50 pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
          </div>
        </div>
      </div>

      {/* Slider Sbilanciamento (-30% … +30%) */}
      <div className="calc-advanced border-b border-border p-4">
        <Label className="mb-2 block">Sbilanciamento della Bancata</Label>
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
              ? 'BONUS + RIMBORSO • '
              : bonusNum > 0
                ? 'BONUS • '
                : rimborsoNum > 0
                  ? 'RIMBORSO • '
                  : ''}
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>
              {rimborsoNum > 0 && crPercent != null
                ? `CR%: ${crPercent.toFixed(2)}%`
                : `Rating: ${rating != null ? rating.toFixed(2) : '—'}%`}
            </p>
            <p>
              <span className="font-medium text-primary">Punta</span>{' '}
              <span className="font-mono text-primary">{formatNum(puntataEffettiva)} €</span>
              {bonusNum > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (di cui {formatNum(bonusNum)} € bonus)
                </span>
              )}{' '}
              a quota <span className="font-mono">{formatNum(quotaPuntaNum)}</span> sul Book.
            </p>
            <p>
              <span className="font-medium text-destructive">Banca</span>{' '}
              <span className="font-mono text-destructive">{formatNum(layStakeValue)} €</span> a
              quota <span className="font-mono">{formatNum(quotaBancaNum)}</span> su Betfair, con
              Responsabilità di{' '}
              <span className="font-mono text-destructive">{formatNum(responsabilita)} €</span>.
            </p>
            {hasValidPartialLays && partialLayTotals != null && (
              <p>
                <span className="font-medium text-destructive">Nuova Responsabilità:</span>{' '}
                <span className="font-mono text-destructive">
                  {formatNum(partialLayTotals.totalLiability)} €
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

      {/* Bancata parziale (multi-step) */}
      {layStakeValue != null && (
        <div className="calc-advanced border-b border-border p-4">
          <div className="space-y-3">
            {partialLays.map((pl, i) => {
              const result = partialLayResults[i] ?? null
              return (
                <div key={i} className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Bancata parziale {partialLays.length > 1 ? `#${i + 1}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePartialLay(i)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`partial-amount-${i}`} className="text-xs sm:text-sm">
                        Già bancato €
                      </Label>
                      <Input
                        id={`partial-amount-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pl.amount}
                        onChange={(e) => updatePartialLay(i, 'amount', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`partial-odds-${i}`} className="text-xs sm:text-sm">
                        Nuova quota banca
                      </Label>
                      <Input
                        id={`partial-odds-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pl.newOdds}
                        onChange={(e) => updatePartialLay(i, 'newOdds', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                  </div>
                  {result != null && (
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-background/60 p-2.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Nuova bancata
                        </p>
                        <p className="font-mono text-sm font-semibold text-destructive">
                          {formatNum(result.newLayStake)} €
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Nuova resp.
                        </p>
                        <p className="font-mono text-sm font-semibold">
                          {formatNum(result.newLiability)} €
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {partialLays.length < 6 && (
              <button
                type="button"
                onClick={addPartialLay}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span className="text-base leading-none">+</span>
                Bancata parziale
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabella dei profitti */}
      {showSummary &&
        guadagnoMinimo != null &&
        quotaPuntaNum != null &&
        layStakeValue != null &&
        responsabilita != null && (
          <div className="calc-advanced border-b border-border bg-card">
            <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              {bonusNum > 0 && rimborsoNum > 0
                ? 'BONUS + RIMBORSO • '
                : bonusNum > 0
                  ? 'BONUS • '
                  : rimborsoNum > 0
                    ? 'RIMBORSO • '
                    : ''}
              Tabella dei profitti
            </div>
            {/* Layout a card solo su mobile (< sm) */}
            <div className="block space-y-3 p-4 sm:hidden">
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Se vinci la puntata sul Book:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book</span>
                    <span className="text-primary">
                      {formatSigned(puntataEffettiva * quotaPuntaNum - (puntataNum ?? 0))} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exchange</span>
                    <span className="text-destructive">
                      {formatSigned(-(effectiveLiability ?? 0))} €
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
                    <span
                      className={cn(
                        totalSeVinciPuntata != null && totalSeVinciPuntata >= 0
                          ? 'text-primary'
                          : 'text-destructive',
                      )}
                    >
                      = {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-destructive/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Se vinci la bancata sull&apos;Exchange:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book</span>
                    <span className="text-destructive">{formatSigned(-(puntataNum ?? 0))} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exchange</span>
                    <span className="text-primary">
                      {effectiveExchangeProfit != null
                        ? formatSigned(effectiveExchangeProfit)
                        : '—'}{' '}
                      €
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
                    <span
                      className={cn(
                        totalSeVinciBancata != null && totalSeVinciBancata >= 0
                          ? 'text-primary'
                          : 'text-destructive',
                      )}
                    >
                      = {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'} €
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
                      Book
                    </th>
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[14%] p-3 text-right font-normal'
                          : 'w-[16%] p-3 text-right font-normal'
                      }
                    >
                      Exchange
                    </th>
                    {showRimborsoColumn && (
                      <th className="w-[14%] p-3 text-right font-normal">Rimborso</th>
                    )}
                    <th className="w-[18%] min-w-[5.5rem] p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci la puntata sul Book:</td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned(puntataEffettiva * quotaPuntaNum - (puntataNum ?? 0))}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(effectiveLiability ?? 0))}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-muted-foreground">{formatSigned(0)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(
                          totalSeVinciPuntata != null && totalSeVinciPuntata >= 0
                            ? 'text-primary'
                            : 'text-destructive',
                        )}
                      >
                        = {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'} €
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-destructive/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci la bancata sull&apos;Exchange:</td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(puntataNum ?? 0))}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {effectiveExchangeProfit != null
                        ? formatSigned(effectiveExchangeProfit)
                        : '—'}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-primary">{formatSigned(rimborsoNum)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(
                          totalSeVinciBancata != null && totalSeVinciBancata >= 0
                            ? 'text-primary'
                            : 'text-destructive',
                        )}
                      >
                        = {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'} €
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Invia al Profit Tracker */}
      <div className="calc-advanced flex flex-col items-center gap-2 p-4">
        <Button
          onClick={() => setSaveModalOpen(true)}
          variant="default"
          disabled={!canOpenSaveModal}
        >
          Invia al Profit Tracker
        </Button>
      </div>

      <PuntaBancaSaveModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        puntataEffettiva={puntataEffettiva}
        puntataNum={puntataNum ?? 0}
        bonusNum={bonusNum}
        rimborsoNum={rimborsoNum}
        quotaPuntaNum={quotaPuntaNum ?? 0}
        quotaBancaNum={quotaBancaNum ?? 0}
        layStake={layStakeValue ?? 0}
        responsabilita={effectiveLiability ?? responsabilita ?? 0}
        commissioneNum={commissioneNum}
        partialLays={partialLays}
        partialLayResults={partialLayResults}
      />
    </div>
  )
}

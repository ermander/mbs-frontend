'use client'

import React, { useMemo, useState } from 'react'
import {
  equivalentBackOdds,
  getImbalanceFactor,
  liability,
  layStakeRimborso,
  ratingPercent,
} from '@/lib/calculators/punta-banca'
import { roundStake } from '@/lib/calculators/stake-step'
import { PuntaBancaSaveModal } from '@/components/calculators/PuntaBancaSaveModal'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import {
  CalcFigure,
  CalcImbalance,
  CalcLayout,
  CalcNumberField,
  CalcOutcomeTable,
  CalcPartials,
  CalcProfits,
  CalcStepper,
  OutcomeRow,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { formatOdds } from '@/lib/landing-format'

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
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
  const [numConti, setNumConti] = useState('1')

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)
  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))

  // Quando si moltiplica la gamba punta su più conti (es. quota maggiorata
  // giocata a nome di più persone), la copertura va calcolata sull'esposizione
  // totale, non sulla singola puntata.
  const numContiNum = Math.max(1, Math.round(parseNum(numConti) ?? 1))
  const totalPuntataNum = (puntataNum ?? 0) * numContiNum
  const totalPuntataEffettiva = puntataEffettiva * numContiNum
  const totalRimborsoNum = rimborsoNum * numContiNum

  const quotaPuntaEquivalente = useMemo(() => {
    if (quotaBancaNum == null) return null
    return equivalentBackOdds(quotaBancaNum, commissioneNum)
  }, [quotaBancaNum, commissioneNum])

  // Formula unica: (puntataEffettiva * quotaPunta - rimborso) / (quotaBanca - comm%)
  // Quando rimborso=0 → formula standard. Quando bonus=0 → formula rimborso pura.
  // Valore esatto: fa da bersaglio alle bancate parziali e al rating.
  const layStakeExact = useMemo(() => {
    if (totalPuntataEffettiva <= 0 || quotaPuntaNum == null || quotaBancaNum == null) return null
    const base = layStakeRimborso(
      totalPuntataEffettiva,
      quotaPuntaNum,
      totalRimborsoNum,
      quotaBancaNum,
      commissioneNum,
    )
    if (base == null) return null
    const factor = getImbalanceFactor(imbalancePercent)
    const adjusted = base * factor
    return Number.isFinite(adjusted) ? adjusted : null
  }, [
    totalPuntataEffettiva,
    totalRimborsoNum,
    quotaPuntaNum,
    quotaBancaNum,
    commissioneNum,
    imbalancePercent,
  ])

  // La bancata da piazzare: multipli di 0,05 € (§14.229). Responsabilità,
  // profitto dell'exchange, riepilogo e salvataggio partono da questa.
  const layStakeValue = layStakeExact == null ? null : roundStake(layStakeExact)

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
      layStakeExact == null
    )
      return []

    const c = commissioneNum / 100
    const coverageTarget = layStakeExact * (quotaBancaNum - c)

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

      const newLayStakeExact = (coverageTarget - coveredSum) / denominator
      if (!Number.isFinite(newLayStakeExact) || newLayStakeExact < 0) {
        results.push(null)
        break
      }

      // Anche il resto da bancare va a multipli di 0,05 €.
      const newLayStake = roundStake(newLayStakeExact)
      const newLiability = newLayStake * (newOddsNum - 1)
      results.push({ newLayStake, newLiability })
    }

    return results
  }, [partialLays, quotaPuntaNum, quotaBancaNum, layStakeExact, commissioneNum])

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

  // Il rating legge le quote, non l'arrotondamento: sulla bancata esatta.
  const rating = useMemo(() => {
    if (totalPuntataEffettiva <= 0 || layStakeExact == null) return null
    return ratingPercent(totalPuntataEffettiva, layStakeExact)
  }, [totalPuntataEffettiva, layStakeExact])

  /** Totale se vinci la puntata sul Book (su tutti i conti moltiplicati) */
  const totalSeVinciPuntata = useMemo(() => {
    if (quotaPuntaNum == null || effectiveLiability == null) return null
    // Book profit: puntataEffettiva * quotaPunta - saldo reale (bonus vinto, reale restituito)
    // Exchange loss: -effectiveLiability
    // Rimborso: 0 (non si ottiene se la puntata vince)
    return totalPuntataEffettiva * quotaPuntaNum - totalPuntataNum - effectiveLiability
  }, [totalPuntataNum, totalPuntataEffettiva, quotaPuntaNum, effectiveLiability])

  /** Totale se vinci la bancata sull'Exchange */
  const totalSeVinciBancata = useMemo(() => {
    if (effectiveExchangeProfit == null) return null
    // Book loss: -puntataNum (perdi solo saldo reale)
    // Exchange profit: +effectiveExchangeProfit
    // Rimborso: +rimborsoNum
    return -totalPuntataNum + effectiveExchangeProfit + totalRimborsoNum
  }, [totalPuntataNum, totalRimborsoNum, effectiveExchangeProfit])

  const guadagnoMinimo = useMemo(() => {
    if (totalSeVinciPuntata == null || totalSeVinciBancata == null) return null
    const minGainValue = Math.min(totalSeVinciPuntata, totalSeVinciBancata)
    return Number.isFinite(minGainValue) ? minGainValue : null
  }, [totalSeVinciPuntata, totalSeVinciBancata])

  const crPercent =
    totalRimborsoNum > 0 && guadagnoMinimo != null && Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / totalRimborsoNum) * 100
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

  // Esborso: il saldo reale puntato più la responsabilità sull'exchange (il bonus non esce dal conto).
  const esborso = showSummary ? totalPuntataNum + (effectiveLiability ?? 0) : null
  const showCr = rimborsoNum > 0 && crPercent != null

  const profitRows: OutcomeProfitRow[] =
    showSummary && quotaPuntaNum != null
      ? [
          {
            id: 'punta',
            esito: 'Se vince la puntata',
            legs: [
              totalPuntataEffettiva * quotaPuntaNum - totalPuntataNum,
              -(effectiveLiability ?? 0),
            ],
            rimborso: 0,
            totale: totalSeVinciPuntata,
          },
          {
            id: 'banca',
            esito: 'Se vince la bancata',
            legs: [-totalPuntataNum, effectiveExchangeProfit],
            rimborso: totalRimborsoNum,
            totale: totalSeVinciBancata,
          },
        ]
      : []

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating
        label={showCr ? 'CR' : 'Rating'}
        value={showCr ? crPercent : showSummary ? rating : null}
        plain
      />

      <CalcLayout
        outcomes={
          <>
            <OutcomeRow
              title="Punta"
              odds={
                <CalcNumberField
                  id="quota-punta"
                  ariaLabel="Quota di puntata"
                  size="sm"
                  value={quotaPunta}
                  onChange={setQuotaPunta}
                />
              }
              figure={
                <CalcFigure
                  label="Puntata"
                  live
                  value={amount(puntataEffettiva > 0 ? puntataEffettiva : null)}
                />
              }
              aside={
                <CalcStepper
                  id="num-conti"
                  label="Conti"
                  size="sm"
                  inline
                  value={numContiNum}
                  min={1}
                  max={99}
                  onChange={(v) => setNumConti(String(v))}
                />
              }
            >
              {numContiNum > 1 && (
                <p className="ds-body-sm col-span-full m-0 text-ds-ink-muted">
                  Stessa puntata su {numContiNum} conti dello stesso sito: la bancata copre il
                  totale di <b className="ds-num text-ds-ink">{amount(totalPuntataEffettiva)}</b>.
                </p>
              )}
            </OutcomeRow>

            <OutcomeRow
              tone="loss"
              title="Banca"
              odds={
                <CalcNumberField
                  id="quota-banca"
                  ariaLabel="Quota di bancata"
                  size="sm"
                  value={quotaBanca}
                  onChange={setQuotaBanca}
                />
              }
              figure={<CalcFigure label="Bancata" live value={amount(layStakeValue)} />}
              aside={
                <div className="flex w-full items-center justify-between gap-3 sm:h-11">
                  <span className="ds-body-sm text-ds-ink-muted">Responsabilità</span>
                  <span className="ds-num whitespace-nowrap text-ds-ink">
                    {amount(responsabilita)}
                  </span>
                </div>
              }
            />

            {layStakeValue != null && (
              <CalcPartials
                idPrefix="partial"
                title="Bancata parziale"
                amountLabel="Già bancato"
                oddsLabel="Nuova quota banca"
                addLabel="Aggiungi bancata parziale"
                entries={partialLays}
                results={partialLayResults}
                figures={(r) => [
                  { label: 'Nuova bancata', value: amount(r?.newLayStake) },
                  { label: 'Nuova resp.', value: amount(r?.newLiability) },
                ]}
                total={
                  hasValidPartialLays && partialLayTotals != null ? (
                    <>
                      Nuova responsabilità{' '}
                      <b className="ds-num text-ds-ink">
                        {amount(partialLayTotals.totalLiability)}
                      </b>
                    </>
                  ) : undefined
                }
                onAdd={addPartialLay}
                onRemove={removePartialLay}
                onChange={updatePartialLay}
              />
            )}
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="puntata"
              label="Puntata reale"
              size="lg"
              suffix="€"
              value={puntata}
              onChange={setPuntata}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="bonus"
                label="Puntata bonus"
                suffix="€"
                value={bonus}
                onChange={setBonus}
              />
              <CalcNumberField
                id="rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={setRimborso}
              />
            </div>
            <CalcImbalance
              label="Sbilancia la bancata"
              value={imbalancePercent}
              onChange={setImbalance}
              leading={
                <CalcNumberField
                  id="commissione"
                  label="Commissione"
                  suffix="%"
                  value={commissione}
                  onChange={setCommissione}
                />
              }
            />
            <div className="flex items-baseline justify-between gap-3 border-t border-ds-line pt-4">
              <span className="ds-body-sm text-ds-ink-muted">Quota punta equivalente</span>
              <span className="ds-num text-ds-ink">
                {quotaPuntaEquivalente != null && Number.isFinite(quotaPuntaEquivalente)
                  ? formatOdds(quotaPuntaEquivalente)
                  : '—'}
              </span>
            </div>
          </>
        }
      />

      <CalcProfits outlay={esborso} minGain={showSummary ? guadagnoMinimo : null}>
        <CalcOutcomeTable
          legLabels={['Punta', 'Banca']}
          rows={profitRows}
          stake={totalPuntataNum}
          emptyText="Il risultato compare quando la puntata e le quote di punta e banca sono compilate e valide."
        />
      </CalcProfits>

      <CalculatorSaveAction onClick={() => setSaveModalOpen(true)} disabled={!canOpenSaveModal} />

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
        numConti={numContiNum}
      />
    </div>
  )
}

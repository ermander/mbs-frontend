import {
  getImbalanceFactor,
  layStakeRimborso,
  layStakeWithImbalance,
  liability,
} from '@/lib/calculators/punta-banca'
import { backLayRating, round2 } from './odds'

/**
 * Punta-Banca engine: the arithmetic of the Oddsmatcher calculator modal
 * (`oddsmatcher-calculator-modal.tsx`) as a pure function, so the scanner v2
 * shares it without a third copy. Same formulas, same rounding: the lay stake
 * is rounded to the cent before the liability and the exchange profit, as the
 * exchange would take it; the partial lays follow the coverage target of the
 * already unbalanced stake. Commission and imbalance are percentages.
 */

export interface PartialLayInput {
  /** Already laid at the previous price (the row price for the first step). */
  amount: number | null
  /** The price the rest is to be laid at. */
  newOdds: number | null
}

export interface PartialLayStep {
  newLayStake: number
  newLiability: number
}

export interface PartialLayTotals {
  totalLiability: number
  totalExchangeProfit: number
  totalLayStake: number
}

export interface PuntaBancaInput {
  /** Real stake on the book; null when the field is empty. */
  puntata: number | null
  bonus: number
  rimborso: number
  quotaPunta: number | null
  quotaBanca: number | null
  /** Exchange commission in percent (4.5 = 4.5%). */
  commissionePercent: number
  /** −30..30, scales the lay stake. */
  imbalancePercent: number
  partialLays: PartialLayInput[]
}

export interface PuntaBancaResult {
  puntataEffettiva: number
  isRimborso: boolean
  /** Lay stake for equal profit, exact. */
  layStake: number | null
  /** The same rounded to the cent: what the user types on the exchange. */
  layStakeRounded: number | null
  /** Liability of the rounded lay stake. */
  responsabilita: number | null
  /** Net exchange win when the lay wins (exact and rounded). */
  exchangeProfit: number | null
  exchangeProfitRounded: number | null
  partialLayResults: (PartialLayStep | null)[]
  hasValidPartialLays: boolean
  partialLayTotals: PartialLayTotals | null
  /** Liability and exchange profit in force: the partial lays when valid, the single lay otherwise. */
  effResponsabilita: number | null
  effExchangeProfit: number | null
  totalSeVinciPuntata: number | null
  totalSeVinciBancata: number | null
  guadagnoMinimo: number | null
  ratingSeVinciPuntata: number | null
  ratingSeVinciBancata: number | null
  /** back·(1−c)/(lay−c)·100, the store's definition, on the prices in the fields. */
  rating: number | null
  showSummary: boolean
}

function finiteOrNull(n: number): number | null {
  return Number.isFinite(n) ? n : null
}

export function computePuntaBanca(input: PuntaBancaInput): PuntaBancaResult {
  const puntataNum = input.puntata
  const bonusNum = input.bonus
  const rimborsoNum = input.rimborso
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = input.quotaPunta
  const quotaBancaNum = input.quotaBanca
  const commissioneNum = input.commissionePercent
  const isRimborso = rimborsoNum > 0

  let layStake: number | null = null
  if (quotaPuntaNum != null && quotaBancaNum != null && puntataNum != null && puntataNum > 0) {
    const backStake = puntataNum + bonusNum
    if (backStake > 0) {
      if (isRimborso) {
        // Rimborso integrato: L = ((S+B)·Qp − R) / (Ql − c) · factor(imbalance)
        const base = layStakeRimborso(
          backStake,
          quotaPuntaNum,
          rimborsoNum,
          quotaBancaNum,
          commissioneNum,
        )
        if (base != null) layStake = finiteOrNull(base * getImbalanceFactor(input.imbalancePercent))
      } else {
        layStake = layStakeWithImbalance(
          backStake,
          quotaPuntaNum,
          quotaBancaNum,
          commissioneNum,
          input.imbalancePercent,
        )
      }
    }
  }

  const layStakeRounded = layStake != null && Number.isFinite(layStake) ? round2(layStake) : null
  const responsabilita =
    layStakeRounded != null && quotaBancaNum != null
      ? liability(layStakeRounded, quotaBancaNum)
      : null
  const exchangeProfit = layStake != null ? layStake * (1 - commissioneNum / 100) : null
  const exchangeProfitRounded =
    layStakeRounded != null ? round2(layStakeRounded * (1 - commissioneNum / 100)) : null

  // ── Bancata parziale (multi-step) ──
  const partialLayResults: (PartialLayStep | null)[] = []
  if (
    input.partialLays.length > 0 &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    layStake != null
  ) {
    const c = commissioneNum / 100
    // The coverage target derives from the already unbalanced lay stake.
    const coverageTarget = layStake * (quotaBancaNum - c)
    let coveredSum = 0
    for (let i = 0; i < input.partialLays.length; i++) {
      const { amount, newOdds } = input.partialLays[i]
      if (amount == null || amount <= 0 || newOdds == null || newOdds <= 1) {
        partialLayResults.push(null)
        break
      }
      const prevOdds = i === 0 ? quotaBancaNum : input.partialLays[i - 1].newOdds
      if (prevOdds == null) {
        partialLayResults.push(null)
        break
      }
      coveredSum += amount * (prevOdds - c)
      const denominator = newOdds - c
      if (denominator <= 0) {
        partialLayResults.push(null)
        break
      }
      const newLayStake = (coverageTarget - coveredSum) / denominator
      if (!Number.isFinite(newLayStake) || newLayStake < 0) {
        partialLayResults.push(null)
        break
      }
      partialLayResults.push({ newLayStake, newLiability: newLayStake * (newOdds - 1) })
    }
  }

  const hasValidPartialLays =
    input.partialLays.length > 0 &&
    partialLayResults.length === input.partialLays.length &&
    partialLayResults.every((r) => r != null)

  let partialLayTotals: PartialLayTotals | null = null
  if (hasValidPartialLays && quotaBancaNum != null) {
    const c = commissioneNum / 100
    let totalLiability = 0
    let totalLayStake = 0
    let valid = true
    // Every "already laid" amount was placed at the price of the previous step.
    for (let i = 0; i < input.partialLays.length; i++) {
      const amount = input.partialLays[i].amount
      const odds = i === 0 ? quotaBancaNum : input.partialLays[i - 1].newOdds
      if (amount == null || amount <= 0 || odds == null) {
        valid = false
        break
      }
      totalLiability += amount * (odds - 1)
      totalLayStake += amount
    }
    // The last computed step is the amount still to be laid.
    const last = partialLayResults[partialLayResults.length - 1]
    if (valid && last != null) {
      totalLiability += last.newLiability
      totalLayStake += last.newLayStake
      partialLayTotals = {
        totalLiability: round2(totalLiability),
        totalExchangeProfit: round2(totalLayStake * (1 - c)),
        totalLayStake,
      }
    }
  }

  const effResponsabilita = partialLayTotals?.totalLiability ?? responsabilita
  const effExchangeProfit =
    partialLayTotals?.totalExchangeProfit ?? exchangeProfitRounded ?? exchangeProfit

  const totalSeVinciPuntata =
    puntataNum == null || quotaPuntaNum == null || effResponsabilita == null
      ? null
      : (puntataNum + bonusNum) * quotaPuntaNum - puntataNum - effResponsabilita
  const totalSeVinciBancata =
    effExchangeProfit == null ? null : -(puntataNum ?? 0) + effExchangeProfit + rimborsoNum
  const guadagnoMinimo =
    totalSeVinciPuntata == null || totalSeVinciBancata == null
      ? null
      : finiteOrNull(Math.min(totalSeVinciPuntata, totalSeVinciBancata))
  const ratingSeVinciPuntata =
    puntataEffettiva <= 0 || totalSeVinciPuntata == null
      ? null
      : finiteOrNull(((totalSeVinciPuntata + (puntataNum ?? 0)) / puntataEffettiva) * 100)
  const ratingSeVinciBancata =
    puntataEffettiva <= 0 || effExchangeProfit == null
      ? null
      : finiteOrNull((effExchangeProfit / puntataEffettiva) * 100)
  const rating =
    quotaPuntaNum != null && quotaBancaNum != null
      ? backLayRating(quotaPuntaNum, quotaBancaNum, commissioneNum)
      : null

  const showSummary =
    puntataNum != null &&
    puntataNum > 0 &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    layStake != null &&
    responsabilita != null

  return {
    puntataEffettiva,
    isRimborso,
    layStake,
    layStakeRounded,
    responsabilita,
    exchangeProfit,
    exchangeProfitRounded,
    partialLayResults,
    hasValidPartialLays,
    partialLayTotals,
    effResponsabilita,
    effExchangeProfit,
    totalSeVinciPuntata,
    totalSeVinciBancata,
    guadagnoMinimo,
    ratingSeVinciPuntata,
    ratingSeVinciBancata,
    rating,
    showSummary,
  }
}

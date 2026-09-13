import { dutchRating, netOdds, round2 } from './odds'

/**
 * Dutching engine for two or three legs, all back bets: the stake goes on one
 * leg (the "punta"), the others are covers sized for the same profit whichever
 * outcome wins, as in the Punta-Punta and Tri-Punta calculators:
 *
 *   cover_i = (S_p · q_p − rimborso) / q_i · factor(imbalance)
 *
 * with every price net of its exchange commission (q_net = 1 + (q − 1)(1 − c)),
 * so a leg on an exchange is priced the way the matcher rated it. Cover
 * stakes are rounded to the cent before the profits, like the stake the user
 * actually places. Profits count the real stake as the only cost of the punta
 * leg: a bonus is not money out of pocket. The rimborso is cashed when the
 * punta leg loses, i.e. when a cover wins.
 */

export interface DutchLegInput {
  /** The price the user sees at the bookmaker or exchange. */
  grossOdds: number | null
  /** 0 for a bookmaker, the exchange commission in percent for an exchange. */
  commissionPercent: number
}

export interface DutchInput {
  legs: DutchLegInput[]
  /** Index of the leg the stake goes on. */
  puntaIndex: number
  puntata: number | null
  bonus: number
  rimborso: number
  /** −30..30, scales the cover stakes. */
  imbalancePercent: number
}

export interface DutchLegResult {
  index: number
  isPunta: boolean
  grossOdds: number | null
  netOdds: number | null
  /** Stake on the leg: puntata + bonus on the punta leg, the rounded cover otherwise. */
  stake: number | null
  /** The cover before rounding (the punta stake as is). */
  stakeExact: number | null
  /** Money back if this leg wins: stake × net price. */
  payout: number | null
  /** Profit if THIS leg wins, after every stake and the rimborso. */
  profit: number | null
}

export interface DutchResult {
  puntataEffettiva: number
  imbalanceFactor: number
  legs: DutchLegResult[]
  /** Real stake plus the rounded covers. */
  totalOutlay: number | null
  guadagnoMinimo: number | null
  /** 100 / Σ(1/q_net): the store's rating on the prices in the fields, stake-independent. */
  rating: number | null
  showSummary: boolean
}

export function computeDutch(input: DutchInput): DutchResult {
  const puntataNum = input.puntata
  const puntataEffettiva = (puntataNum ?? 0) + input.bonus
  const clamped = Math.max(-30, Math.min(30, input.imbalancePercent))
  const imbalanceFactor = Number.isFinite(clamped) ? 1 + clamped / 100 : 1

  const nets = input.legs.map((leg) =>
    leg.grossOdds != null && leg.grossOdds > 0
      ? netOdds(leg.grossOdds, leg.commissionPercent)
      : null,
  )
  const allPriced = nets.length >= 2 && nets.every((n): n is number => n != null && n > 0)
  const rating = allPriced ? dutchRating(nets as number[]) : null

  const puntaOk =
    input.puntaIndex >= 0 &&
    input.puntaIndex < input.legs.length &&
    puntataNum != null &&
    puntataNum > 0 &&
    puntataEffettiva > 0
  const puntaNet = puntaOk && allPriced ? (nets[input.puntaIndex] as number) : null

  // (S_p · q_p − R) must stay positive, as in stakeBFromStakeARimborso.
  const numerator = puntaNet != null ? puntataEffettiva * puntaNet - input.rimborso : null
  const coversOk = numerator != null && numerator > 0

  const legs: DutchLegResult[] = input.legs.map((leg, index) => {
    const isPunta = index === input.puntaIndex
    const net = nets[index]
    let stakeExact: number | null = null
    let stake: number | null = null
    if (isPunta) {
      if (puntaOk) {
        stakeExact = puntataEffettiva
        stake = puntataEffettiva
      }
    } else if (coversOk && net != null) {
      const exact = ((numerator as number) / net) * imbalanceFactor
      if (Number.isFinite(exact) && exact >= 0) {
        stakeExact = exact
        stake = round2(exact)
      }
    }
    return {
      index,
      isPunta,
      grossOdds: leg.grossOdds,
      netOdds: net,
      stake,
      stakeExact,
      payout: stake != null && net != null ? stake * net : null,
      profit: null,
    }
  })

  const coversComputed = coversOk && legs.every((l) => l.stake != null)
  let totalOutlay: number | null = null
  let guadagnoMinimo: number | null = null
  if (coversComputed && puntataNum != null) {
    const coversTotal = legs.filter((l) => !l.isPunta).reduce((sum, l) => sum + (l.stake ?? 0), 0)
    totalOutlay = puntataNum + coversTotal
    for (const leg of legs) {
      const payout = leg.payout ?? 0
      leg.profit = leg.isPunta ? payout - totalOutlay : payout - totalOutlay + input.rimborso
    }
    const profits = legs.map((l) => l.profit ?? Number.NaN)
    const min = Math.min(...profits)
    guadagnoMinimo = Number.isFinite(min) ? min : null
  }

  return {
    puntataEffettiva,
    imbalanceFactor,
    legs,
    totalOutlay,
    guadagnoMinimo,
    rating,
    showSummary: coversComputed,
  }
}

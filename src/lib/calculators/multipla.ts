/**
 * Multipla (multiple/parlay) bet calculation helpers.
 * Supports mixed punta-banca (lay) and punta-punta (counter-bet) events.
 *
 * Sequential hedging formula:
 * - payoutFactor: net gain per unit when hedge WINS (main event loses)
 *   PB: 1 - commission,  PP: coverOdds - 1
 * - costFactor: loss per unit when hedge LOSES (main event wins)
 *   PB: coverOdds - 1 (liability),  PP: 1 (lose the stake)
 * - denominator = payoutFactor + costFactor
 *   PB: coverOdds - commission,  PP: coverOdds
 *
 * Last event:  hedgeStake_N = (S × Q - rimborso) / denom_N
 * Earlier:     hedgeStake_i = hedgeStake_{i+1} × payout_{i+1} / denom_i
 */

export interface MultiplaHedgeEvent {
  type: 'punta-banca' | 'punta-punta'
  coverOdds: number
  commissionPercent: number
}

export interface MultiplaHedgeResult {
  hedgeStake: number
  hedgeCost: number
  payoutFactor: number
  costFactor: number
}

function getFactors(ev: MultiplaHedgeEvent): { payout: number; cost: number; denom: number } {
  if (ev.type === 'punta-punta') {
    const payout = ev.coverOdds - 1
    const cost = 1
    return { payout, cost, denom: ev.coverOdds }
  }
  // punta-banca
  const comm = ev.commissionPercent / 100
  const payout = 1 - comm
  const cost = ev.coverOdds - 1
  return { payout, cost, denom: ev.coverOdds - comm }
}

export function multiplaLayStakes(
  backStakeTotale: number,
  totalBackOdds: number,
  events: MultiplaHedgeEvent[],
  rimborso: number = 0,
): MultiplaHedgeResult[] {
  if (events.length === 0) return []
  if (backStakeTotale <= 0 || totalBackOdds <= 0) {
    return events.map((ev) => {
      const { payout, cost } = getFactors(ev)
      return { hedgeStake: 0, hedgeCost: 0, payoutFactor: payout, costFactor: cost }
    })
  }

  const n = events.length
  const factors = events.map(getFactors)
  const stakes: number[] = new Array(n).fill(0)

  // Last event
  if (factors[n - 1]!.denom <= 0) {
    return events.map((_, i) => ({
      hedgeStake: 0,
      hedgeCost: 0,
      payoutFactor: factors[i]!.payout,
      costFactor: factors[i]!.cost,
    }))
  }
  stakes[n - 1] = (backStakeTotale * totalBackOdds - rimborso) / factors[n - 1]!.denom

  // Earlier events (backward)
  for (let i = n - 2; i >= 0; i--) {
    const denom = factors[i]!.denom
    if (denom <= 0) {
      stakes[i] = 0
    } else {
      stakes[i] = (stakes[i + 1]! * factors[i + 1]!.payout) / denom
    }
  }

  return events.map((_, i) => {
    const s = stakes[i] ?? 0
    const f = factors[i]!
    return {
      hedgeStake: s,
      hedgeCost: s * f.cost,
      payoutFactor: f.payout,
      costFactor: f.cost,
    }
  })
}

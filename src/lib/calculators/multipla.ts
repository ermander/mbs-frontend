/**
 * Multipla (multiple/parlay) bet calculation helpers.
 * Sequential hedging formula for lay stakes across multiple events.
 */

import { liability } from './punta-banca'

/**
 * Lay stakes for multipla (multiple) bets: sequential hedging formula.
 * Events are in chronological order (first to play = index 0).
 * Last event: layStake_N = (backStakeTotale * totalBackOdds - rimborso) / (layOdds_N - comm_N).
 * Each earlier event: layStake_i = layStake_{i+1} * (1 - comm_{i+1}) / (layOdds_i - comm_i).
 * Commission is per-event (each leg can have a different commission).
 * Optional rimborso reduces lay stakes (refund received if multipla loses).
 */
export function multiplaLayStakes(
  backStakeTotale: number,
  totalBackOdds: number,
  events: { layOdds: number; commissionPercent: number }[],
  rimborso: number = 0,
): { layStake: number; liability: number }[] {
  const result: { layStake: number; liability: number }[] = []
  if (events.length === 0) return result
  if (backStakeTotale <= 0 || totalBackOdds <= 0) {
    return events.map((e) => ({
      layStake: 0,
      liability: liability(0, e.layOdds) ?? 0,
    }))
  }
  const n = events.length
  const stakes: number[] = []
  const last = events[n - 1]!
  const commLast = last.commissionPercent / 100
  const denomLast = last.layOdds - commLast
  if (denomLast <= 0) {
    return events.map(() => ({
      layStake: 0,
      liability: 0,
    }))
  }
  stakes[n - 1] = (backStakeTotale * totalBackOdds - rimborso) / denomLast
  for (let i = n - 2; i >= 0; i--) {
    const e = events[i]!
    const commI = e.commissionPercent / 100
    const commNext = events[i + 1]!.commissionPercent / 100
    const oneMinusCommNext = 1 - commNext
    const denom = e.layOdds - commI
    if (denom <= 0) {
      stakes[i] = 0
    } else {
      stakes[i] = (stakes[i + 1]! * oneMinusCommNext) / denom
    }
  }
  return events.map((ev, i) => {
    const s = stakes[i] ?? 0
    return {
      layStake: s,
      liability: liability(s, ev.layOdds) ?? 0,
    }
  })
}

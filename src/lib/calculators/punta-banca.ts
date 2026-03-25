/**
 * Matched betting (Punta-Banca) calculation helpers.
 * Formulas aligned with standard lay stake / equivalent back odds / liability.
 */

/**
 * Equivalent back odds from lay odds and exchange commission.
 * effectiveLayOdds = layOdds / (1 - commission/100)
 */
export function equivalentBackOdds(layOdds: number, commissionPercent: number): number | null {
  if (commissionPercent >= 100 || layOdds <= 0) return null
  const factor = 1 - commissionPercent / 100
  if (factor <= 0) return null
  const equivalent = layOdds / factor
  return Number.isFinite(equivalent) ? equivalent : null
}

/**
 * Lay stake (bancata) for equal profit regardless of outcome.
 * Formula: layStake = (Back odds × Back stake) / (Lay odds - commission/100)
 * Con commission in percentuale (es. 3 per 3%). Stesso risultato se back vince o se lay vince.
 */
export function layStake(
  backStake: number,
  backOdds: number,
  layOdds: number,
  commissionPercent: number,
): number | null {
  if (backStake <= 0 || backOdds <= 0 || layOdds <= 0) return null
  const denom = layOdds - commissionPercent / 100
  if (denom <= 0) return null
  const stake = (backOdds * backStake) / denom
  return Number.isFinite(stake) ? stake : null
}

/**
 * Liability (responsabilità) on the lay bet: amount at risk on the exchange.
 * Liability = Lay stake × (Lay odds - 1)
 */
export function liability(layStakeAmount: number, layOdds: number): number | null {
  if (layStakeAmount < 0 || layOdds <= 0) return null
  const liab = layStakeAmount * (layOdds - 1)
  return Number.isFinite(liab) ? liab : null
}

/**
 * Lay stakes for multipla (multiple) bets: sequential hedging formula.
 * Events are in chronological order (first to play = index 0).
 * Last event: layStake_N = backStakeTotale * totalBackOdds / (layOdds_N - comm_N).
 * Each earlier event: layStake_i = layStake_{i+1} * (1 - comm_{i+1}) / (layOdds_i - comm_i).
 * Commission is per-event (each leg can have a different commission).
 */
export function multiplaLayStakes(
  backStakeTotale: number,
  totalBackOdds: number,
  events: { layOdds: number; commissionPercent: number }[],
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
  stakes[n - 1] = (backStakeTotale * totalBackOdds) / denomLast
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

/**
 * Sbilanciamento della Bancata: percentuale da -30 a +30.
 * Factor = 1 + percent/100 (es. -30 → 0.70, 0 → 1, +30 → 1.30).
 */
export function getImbalanceFactor(percent: number): number {
  const clamped = Math.max(-30, Math.min(30, percent))
  const factor = 1 + clamped / 100
  return Number.isFinite(factor) ? factor : 1
}

/**
 * Rating (percent): lay stake as percentage of back stake.
 * ratingPercent = (layStakeAmount / backStake) * 100
 */
export function ratingPercent(backStake: number, layStakeAmount: number): number | null {
  if (backStake <= 0 || layStakeAmount == null || !Number.isFinite(layStakeAmount)) return null
  const pct = (layStakeAmount / backStake) * 100
  return Number.isFinite(pct) ? pct : null
}

/**
 * Minimum gain (same in both outcomes when lay is calculated for equal profit).
 * minGain = backStake * (backOdds - 1) - liabilityAmount
 */
export function minGain(
  backStake: number,
  backOdds: number,
  liabilityAmount: number,
): number | null {
  if (
    backStake < 0 ||
    backOdds <= 0 ||
    liabilityAmount == null ||
    !Number.isFinite(liabilityAmount)
  )
    return null
  const gain = backStake * (backOdds - 1) - liabilityAmount
  return Number.isFinite(gain) ? gain : null
}

/**
 * Lay stake for refund (Rimborso) mode: equal profit when back wins vs when lay wins + refund.
 * layStake = (stake * backOdds - refund) / (layOdds - commissionPercent/100)
 */
export function layStakeRimborso(
  stake: number,
  backOdds: number,
  refund: number,
  layOdds: number,
  commissionPercent: number,
): number | null {
  if (stake <= 0 || backOdds <= 0 || layOdds <= 0) return null
  const denom = layOdds - commissionPercent / 100
  if (denom <= 0) return null
  const numerator = stake * backOdds - refund
  if (numerator <= 0) return null
  const lay = numerator / denom
  return Number.isFinite(lay) ? lay : null
}

/**
 * Lay stake adjusted by imbalance (for display/agenda).
 * imbalancePercent: -30..30 (solo in modalità avanzata).
 */
export function layStakeWithImbalance(
  backStake: number,
  backOdds: number,
  layOdds: number,
  commissionPercent: number,
  imbalancePercent: number,
): number | null {
  const base = layStake(backStake, backOdds, layOdds, commissionPercent)
  if (base == null) return null
  const factor = getImbalanceFactor(imbalancePercent)
  const adjusted = base * factor
  return Number.isFinite(adjusted) ? adjusted : null
}

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
 * Equal profit when: backStake*(backOdds-1) - liability = layStake*(1-commission/100) - backStake.
 * => layStake = (Back odds × Back stake) / (Lay odds - commission/100)
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
 * Bancata parziale: stake da abbinare alla nuova quota per avere lo stesso profitto
 * in entrambi gli esiti (vince puntata / vince bancata). Formula: ugualianza profitti.
 * B = (S·Ob - A(Ol-1) - A(1-c)) / ((On-1) + (1-c))
 */
export function remainingLayStakeAtNewOdds(
  backStake: number,
  backOdds: number,
  matchedStake: number,
  originalLayOdds: number,
  newLayOdds: number,
  commissionPercent: number,
): number | null {
  if (backStake <= 0 || backOdds <= 0 || originalLayOdds <= 1 || newLayOdds <= 1) return null
  const c = commissionPercent / 100
  const numerator =
    backStake * backOdds - matchedStake * (originalLayOdds - 1) - matchedStake * (1 - c)
  const denominator = newLayOdds - 1 + (1 - c)
  if (denominator <= 0) return null
  const stakeAtNewOdds = numerator / denominator
  return Number.isFinite(stakeAtNewOdds) ? stakeAtNewOdds : null
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

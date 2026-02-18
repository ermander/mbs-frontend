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
 * Lay stake = (Back odds × Back stake) / (Lay odds × (1 - commission/100))
 */
export function layStake(
  backStake: number,
  backOdds: number,
  layOdds: number,
  commissionPercent: number,
): number | null {
  if (backStake <= 0 || backOdds <= 0 || layOdds <= 0) return null
  if (commissionPercent >= 100) return null
  const factor = 1 - commissionPercent / 100
  if (factor <= 0) return null
  const stake = (backOdds * backStake) / (layOdds * factor)
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

/** Slider value: 0 = Under, 1 = Standard, 2 = Over */
export type ImbalanceValue = 0 | 1 | 2

/**
 * Factor applied to lay stake for "Sbilanciamento della Bancata".
 * Under = slightly less lay (0.95), Standard = 1, Over = slightly more (1.05).
 */
export function getImbalanceFactor(value: ImbalanceValue): number {
  switch (value) {
    case 0:
      return 0.95
    case 1:
      return 1
    case 2:
      return 1.05
    default:
      return 1
  }
}

/**
 * Lay stake adjusted by imbalance (for display/agenda).
 */
export function layStakeWithImbalance(
  backStake: number,
  backOdds: number,
  layOdds: number,
  commissionPercent: number,
  imbalance: ImbalanceValue,
): number | null {
  const base = layStake(backStake, backOdds, layOdds, commissionPercent)
  if (base == null) return null
  const factor = getImbalanceFactor(imbalance)
  const adjusted = base * factor
  return Number.isFinite(adjusted) ? adjusted : null
}

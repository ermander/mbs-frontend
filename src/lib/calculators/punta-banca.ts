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
  // #region agent log
  if (typeof fetch !== 'undefined')
    fetch('http://127.0.0.1:7629/ingest/3106dbfd-66a0-4e79-9380-92a1b790d016', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '897992' },
      body: JSON.stringify({
        sessionId: '897992',
        location: 'punta-banca.ts:layStake',
        message: 'Lay stake formula',
        data: { backStake, backOdds, layOdds, commissionPercent, stake, denom },
        timestamp: Date.now(),
        hypothesisId: 'H2',
      }),
    }).catch(() => {})
  // #endregion
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

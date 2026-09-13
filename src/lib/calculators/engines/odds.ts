/** Price arithmetic shared by the engines. Commissions are percentages (4.5 = 4.5%). */

/** Price net of an exchange commission, as the matcher counts it in a dutch: 1 + (q − 1)(1 − c). */
export function netOdds(grossOdds: number, commissionPercent: number): number {
  const c = commissionPercent / 100
  return 1 + (grossOdds - 1) * (1 - c)
}

/** The inverse of netOdds: the price the user sees on the exchange. */
export function grossOdds(netOddsValue: number, commissionPercent: number): number {
  const c = commissionPercent / 100
  if (c >= 1) return netOddsValue
  return 1 + (netOddsValue - 1) / (1 - c)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Rating of a dutch as the store computes it: 100 / Σ(1/q_net). */
export function dutchRating(netPrices: number[]): number | null {
  if (netPrices.length === 0) return null
  let sum = 0
  for (const q of netPrices) {
    if (!(q > 0)) return null
    sum += 1 / q
  }
  return sum > 0 ? 100 / sum : null
}

/** Rating of a back/lay pair as the store computes it: back·(1 − c) / (lay − c) · 100. */
export function backLayRating(
  backOdds: number,
  layOdds: number,
  commissionPercent: number,
): number | null {
  const c = commissionPercent / 100
  if (!(backOdds > 0) || !(layOdds > 0)) return null
  const denom = layOdds - c
  if (denom <= 0) return null
  const r = (backOdds * (1 - c)) / denom
  return Number.isFinite(r) ? r * 100 : null
}

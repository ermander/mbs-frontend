/**
 * Punta-Punta (dutching a 2 esiti) calculation helpers.
 * Due puntate su due book con profitto uguale qualunque esito vinca.
 * Quote decimali: q1, q2. Condizione equal profit: S_A * q_A = S_B * q_B.
 */

/**
 * Dato stake A e quote, calcola stake B per profitto uguale.
 * S_B = (S_A * q_A) / q_B
 */
export function stakeBFromStakeA(stakeA: number, oddsA: number, oddsB: number): number | null {
  if (stakeA <= 0 || oddsA <= 0 || oddsB <= 0) return null
  const sb = (stakeA * oddsA) / oddsB
  return Number.isFinite(sb) ? sb : null
}

/**
 * Dato budget totale T e quote, calcola gli stake per profitto uguale.
 * S1 = T * q2 / (q1 + q2), S2 = T * q1 / (q1 + q2)
 */
export function stakesFromTotal(
  totalStake: number,
  oddsA: number,
  oddsB: number,
): { stakeA: number; stakeB: number } | null {
  if (totalStake <= 0 || oddsA <= 0 || oddsB <= 0) return null
  const sum = oddsA + oddsB
  if (sum <= 0) return null
  const stakeA = (totalStake * oddsB) / sum
  const stakeB = (totalStake * oddsA) / sum
  if (!Number.isFinite(stakeA) || !Number.isFinite(stakeB)) return null
  return { stakeA, stakeB }
}

/**
 * Profitto garantito (uguale in entrambi gli esiti).
 * P = S_A * q_A - (S_A + S_B) = S_B * q_B - (S_A + S_B)
 */
export function equalProfit(
  stakeA: number,
  oddsA: number,
  stakeB: number,
  oddsB: number,
): number | null {
  if (stakeA < 0 || stakeB < 0 || oddsA <= 0 || oddsB <= 0) return null
  const returnA = stakeA * oddsA
  const totalStake = stakeA + stakeB
  const profit = returnA - totalStake
  return Number.isFinite(profit) ? profit : null
}

/**
 * Surebet: guadagno garantito positivo.
 * 1/q1 + 1/q2 < 1
 */
export function isSurebet(oddsA: number, oddsB: number): boolean {
  if (oddsA <= 0 || oddsB <= 0) return false
  const implied = 1 / oddsA + 1 / oddsB
  return implied < 1
}

/**
 * Rating percentuale: dipende solo dalle quote.
 * Formula: q_A * (q_B - 1) / q_B * 100 (es. 2.3, 2.5 → 138%)
 */
export function ratingPercent(oddsA: number, oddsB: number): number | null {
  if (oddsA <= 0 || oddsB <= 0) return null
  const pct = ((oddsA * (oddsB - 1)) / oddsB) * 100
  return Number.isFinite(pct) ? pct : null
}

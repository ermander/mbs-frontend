/**
 * Tri-Punta (dutching a 3 esiti) calculation helpers.
 * Tre puntate su tre book con profitto uguale qualunque esito vinca.
 * Quote decimali: q_A, q_B, q_C. Condizione equal profit: S_A * q_A = S_B * q_B = S_C * q_C.
 */

/**
 * Dato stake A e quote, calcola stake B e C per profitto uguale.
 * S_B = (S_A * q_A) / q_B
 * S_C = (S_A * q_A) / q_C
 */
export function stakeBCFromStakeA(
  stakeA: number,
  oddsA: number,
  oddsB: number,
  oddsC: number,
): { stakeB: number; stakeC: number } | null {
  if (stakeA <= 0 || oddsA <= 0 || oddsB <= 0 || oddsC <= 0) return null
  const stakeB = (stakeA * oddsA) / oddsB
  const stakeC = (stakeA * oddsA) / oddsC
  if (!Number.isFinite(stakeB) || !Number.isFinite(stakeC)) return null
  return { stakeB, stakeC }
}

/**
 * Dato budget totale T e quote, calcola gli stake per profitto uguale.
 * Σ = 1/q_A + 1/q_B + 1/q_C
 * S_i = T / (q_i × Σ)
 */
export function stakesFromTotal(
  totalStake: number,
  oddsA: number,
  oddsB: number,
  oddsC: number,
): { stakeA: number; stakeB: number; stakeC: number } | null {
  if (totalStake <= 0 || oddsA <= 0 || oddsB <= 0 || oddsC <= 0) return null
  const sigma = 1 / oddsA + 1 / oddsB + 1 / oddsC
  if (sigma <= 0) return null
  const stakeA = totalStake / (oddsA * sigma)
  const stakeB = totalStake / (oddsB * sigma)
  const stakeC = totalStake / (oddsC * sigma)
  if (!Number.isFinite(stakeA) || !Number.isFinite(stakeB) || !Number.isFinite(stakeC)) return null
  return { stakeA, stakeB, stakeC }
}

/**
 * Profitto garantito (uguale in tutti e tre gli esiti).
 * P = S_A * q_A - (S_A + S_B + S_C)
 */
export function equalProfit(
  stakeA: number,
  oddsA: number,
  stakeB: number,
  oddsB: number,
  stakeC: number,
  oddsC: number,
): number | null {
  if (stakeA < 0 || stakeB < 0 || stakeC < 0 || oddsA <= 0 || oddsB <= 0 || oddsC <= 0) return null
  const returnA = stakeA * oddsA
  const totalStake = stakeA + stakeB + stakeC
  const profit = returnA - totalStake
  return Number.isFinite(profit) ? profit : null
}

/**
 * Surebet: guadagno garantito positivo.
 * 1/q_A + 1/q_B + 1/q_C < 1
 */
export function isSurebet(oddsA: number, oddsB: number, oddsC: number): boolean {
  if (oddsA <= 0 || oddsB <= 0 || oddsC <= 0) return false
  const implied = 1 / oddsA + 1 / oddsB + 1 / oddsC
  return implied < 1
}

/**
 * Rating percentuale: 100 / Σ dove Σ = 1/q_A + 1/q_B + 1/q_C.
 * >100% = surebet, 100% = break-even, <100% = margine bookmaker.
 */
export function ratingPercent(oddsA: number, oddsB: number, oddsC: number): number | null {
  if (oddsA <= 0 || oddsB <= 0 || oddsC <= 0) return null
  const sigma = 1 / oddsA + 1 / oddsB + 1 / oddsC
  if (sigma <= 0) return null
  const pct = (1 / sigma) * 100
  return Number.isFinite(pct) ? pct : null
}

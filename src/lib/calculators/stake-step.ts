/**
 * The step of every stake a sport calculator computes (§14.229): bookmakers
 * and exchanges take multiples of five cents, so a cover, a lay, a hedge or
 * the rest of a partial one is rounded to 0.05 as soon as it is computed,
 * before the liabilities and the profits, like the stake the user actually
 * places. What the user types is never rounded; the casino calculators keep
 * their own chip (`engines/casino-common.ts`).
 */
export const STAKE_STEP = 0.05

/** The nearest multiple of STAKE_STEP (ties up), fixed to the cent; a non-finite amount comes back as is. */
export function roundStake(amount: number): number {
  if (!Number.isFinite(amount)) return amount
  const units = Math.round(amount / STAKE_STEP + 1e-9)
  return Math.round(units * STAKE_STEP * 100) / 100
}

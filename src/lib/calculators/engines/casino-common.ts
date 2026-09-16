/** Chips and rating shared by the casino engines (Baccarat, Roulette). */

/** The chip denominations a table may impose; 0.01 means «no constraint». */
export const CHIP_OPTIONS = [0.01, 0.1, 0.2, 0.5, 1, 5] as const
export type Chip = (typeof CHIP_OPTIONS)[number]
export const DEFAULT_CHIP: Chip = 1

/** The nearest multiple of the chip (ties up), fixed to the cent. */
export function roundToChip(amount: number, chip: number): number {
  if (!(chip > 0)) return Math.round(amount * 100) / 100
  const units = Math.round(amount / chip + 1e-9)
  return Math.round(units * chip * 100) / 100
}

/**
 * Rating on the real result, the way the user reads it at the table: what
 * comes back of the stake played, (real stake + minimum profit) / (real +
 * bonus) · 100. With real money only it is 100 + min/stake; with a bonus only
 * it is the conversion rate of the bonus.
 */
export function realRating(
  puntataReale: number,
  puntataEffettiva: number,
  guadagnoMinimo: number | null,
): number | null {
  if (guadagnoMinimo == null || !(puntataEffettiva > 0)) return null
  const r = ((puntataReale + guadagnoMinimo) / puntataEffettiva) * 100
  return Number.isFinite(r) ? r : null
}

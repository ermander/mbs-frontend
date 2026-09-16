import { stakeBFromStakeA, stakeBFromStakeARimborso } from '@/lib/calculators/punta-punta'
import { realRating, roundToChip } from './casino-common'

/**
 * Baccarat engine: the Player/Banco hedge as a pure function. The punta (real
 * stake plus bonus) goes on one side, on one account, and is covered on the
 * other side on another account: Player pays 1:1 (decimal 2.00), Banco pays
 * 1:1 less the 5% commission (decimal 1.95). A tie returns both stakes: the
 * hand is void and is simply played again, so the cover is sized on the two
 * decisive outcomes only, with the same formulas as the offline Punta-Punta
 * (bonus counted as returned stake, refund received when the punta loses).
 * The cover is rounded to the table's minimum chip before the profits, as it
 * is played, or replaced by the amount the user locked in.
 */

/** Player pays 1:1. */
export const BACCARAT_PLAYER_ODDS = 2
/** Banco pays 1:1 less this commission. */
export const BACCARAT_BANCO_COMMISSION_PERCENT = 5
/** 1 + 0.95: the only Banco price the calculator knows. */
export const BACCARAT_BANCO_ODDS = 1 + (1 - BACCARAT_BANCO_COMMISSION_PERCENT / 100)

export type BaccaratSide = 'player' | 'banco'
/** Fixed order of the legs, the outcomes and the table columns. */
export const BACCARAT_SIDES: BaccaratSide[] = ['player', 'banco']
export const BACCARAT_SIDE_LABELS: Record<BaccaratSide, string> = {
  player: 'Player',
  banco: 'Banco',
}
export const BACCARAT_SIDE_ODDS: Record<BaccaratSide, number> = {
  player: BACCARAT_PLAYER_ODDS,
  banco: BACCARAT_BANCO_ODDS,
}

export function otherSide(side: BaccaratSide): BaccaratSide {
  return side === 'player' ? 'banco' : 'player'
}

export interface BaccaratInput {
  /** Real stake on the punta; null when the field is empty. */
  puntata: number | null
  /** Bonus stake on the punta, returned with the win as in the sport calculators. */
  bonus: number
  /** Refund received on the punta account when the punta loses. */
  rimborso: number
  /** Where the punta goes; the other side is the cover. */
  puntaSide: BaccaratSide
  /** Minimum chip of the table: the cover is rounded to a multiple of it. */
  chip: number
  /** True when the user locked the cover and plays `coverOverride` instead of the computed amount. */
  coverLocked: boolean
  coverOverride: number | null
}

export interface BaccaratLegResult {
  side: BaccaratSide
  label: string
  odds: number
  isPunta: boolean
  /** Punta: real stake plus bonus. Cover: the amount to play (rounded to the chip, or the locked one). */
  stake: number | null
  /** The cover before rounding (the punta stake as is). */
  stakeExact: number | null
  /** The cover rounded to the chip, even when a locked amount replaces it. */
  stakeRounded: number | null
  locked: boolean
}

export interface BaccaratOutcomeResult {
  winner: BaccaratSide
  label: string
  /** Net movement of the Player account and of the Banco account (BACCARAT_SIDES order). */
  byLeg: (number | null)[]
  /** The refund cashed on this outcome (punta lost). */
  rimborso: number
  profit: number | null
}

export interface BaccaratResult {
  puntaSide: BaccaratSide
  coverSide: BaccaratSide
  /** Real stake plus bonus: what sits on the punta. */
  puntataEffettiva: number
  isRimborso: boolean
  /** Player first, Banco second, whichever is the punta. */
  legs: BaccaratLegResult[]
  /** «Player wins» first, «Banco wins» second; a tie moves nothing. */
  outcomes: BaccaratOutcomeResult[]
  /** The cover as played. */
  stakeCover: number | null
  stakeCoverExact: number | null
  stakeCoverRounded: number | null
  coverLocked: boolean
  guadagnoMinimo: number | null
  /** On the real result: (real stake + minimum profit) / (real + bonus) · 100. */
  rating: number | null
  /** guadagnoMinimo / rimborso · 100, only in rimborso mode. */
  crPercent: number | null
  showSummary: boolean
}

export function computeBaccarat(input: BaccaratInput): BaccaratResult {
  const puntata = input.puntata ?? 0
  const { bonus, rimborso, puntaSide } = input
  const coverSide = otherSide(puntaSide)
  const quotaPunta = BACCARAT_SIDE_ODDS[puntaSide]
  const quotaCover = BACCARAT_SIDE_ODDS[coverSide]
  const puntataEffettiva = puntata + bonus
  const isRimborso = rimborso > 0
  const validAmounts = puntata >= 0 && bonus >= 0 && rimborso >= 0 && puntataEffettiva > 0

  let stakeCoverExact: number | null = null
  if (validAmounts) {
    stakeCoverExact = isRimborso
      ? stakeBFromStakeARimborso(puntataEffettiva, quotaPunta, quotaCover, rimborso)
      : stakeBFromStakeA(puntataEffettiva, quotaPunta, quotaCover)
  }
  const stakeCoverRounded =
    stakeCoverExact != null ? roundToChip(stakeCoverExact, input.chip) : null
  const lockedAmount =
    input.coverLocked && input.coverOverride != null && input.coverOverride > 0
      ? input.coverOverride
      : null
  const stakeCover = input.coverLocked ? lockedAmount : stakeCoverRounded
  const ready = validAmounts && stakeCoverExact != null && stakeCover != null

  const legs: BaccaratLegResult[] = BACCARAT_SIDES.map((side) => {
    const isPunta = side === puntaSide
    return {
      side,
      label: BACCARAT_SIDE_LABELS[side],
      odds: BACCARAT_SIDE_ODDS[side],
      isPunta,
      stake: isPunta ? (validAmounts ? puntataEffettiva : null) : stakeCover,
      stakeExact: isPunta ? (validAmounts ? puntataEffettiva : null) : stakeCoverExact,
      stakeRounded: isPunta ? (validAmounts ? puntataEffettiva : null) : stakeCoverRounded,
      locked: isPunta ? false : input.coverLocked,
    }
  })

  const outcomes: BaccaratOutcomeResult[] = BACCARAT_SIDES.map((winner) => {
    const label = `Vince ${BACCARAT_SIDE_LABELS[winner]}`
    if (!ready || stakeCover == null) {
      return { winner, label, byLeg: [null, null], rimborso: 0, profit: null }
    }
    const byLeg = BACCARAT_SIDES.map((side) => {
      const isPunta = side === puntaSide
      const stake = isPunta ? puntataEffettiva : stakeCover
      const cost = isPunta ? puntata : stakeCover
      const odds = BACCARAT_SIDE_ODDS[side]
      return side === winner ? stake * odds - cost : -cost
    })
    const refund = winner === puntaSide ? 0 : rimborso
    return { winner, label, byLeg, rimborso: refund, profit: byLeg[0]! + byLeg[1]! + refund }
  })

  const profits = outcomes.map((o) => o.profit).filter((p): p is number => p != null)
  const guadagnoMinimo = profits.length === 2 ? Math.min(...profits) : null
  const rating = realRating(puntata, puntataEffettiva, guadagnoMinimo)
  const crPercent = isRimborso && guadagnoMinimo != null ? (guadagnoMinimo / rimborso) * 100 : null

  return {
    puntaSide,
    coverSide,
    puntataEffettiva,
    isRimborso,
    legs,
    outcomes,
    stakeCover,
    stakeCoverExact,
    stakeCoverRounded,
    coverLocked: input.coverLocked,
    guadagnoMinimo,
    rating,
    crPercent,
    showSummary: ready && guadagnoMinimo != null,
  }
}

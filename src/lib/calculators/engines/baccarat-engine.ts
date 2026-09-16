import {
  ratingPercent,
  stakeBFromStakeA,
  stakeBFromStakeARimborso,
} from '@/lib/calculators/punta-punta'
import { round2 } from './odds'

/**
 * Baccarat engine: the Player/Banco hedge as a pure function. Player is backed
 * on one account (pays 1:1, decimal 2.00) and covered with Banco on another
 * (pays 1:1 less the 5% commission, decimal 1.95). A tie returns both stakes:
 * the hand is void and is simply played again, so the Banco stake is sized on
 * the two decisive outcomes only, with the same formulas as the offline
 * Punta-Punta (bonus counted as returned stake, refund received when Player
 * loses). The Banco stake is rounded to the cent before the profits, as it is
 * played at the table.
 */

/** Player pays 1:1. */
export const BACCARAT_PLAYER_ODDS = 2
/** Banco pays 1:1 less this commission. */
export const BACCARAT_BANCO_COMMISSION_PERCENT = 5
/** 1 + 0.95: the only Banco price the calculator knows. */
export const BACCARAT_BANCO_ODDS = 1 + (1 - BACCARAT_BANCO_COMMISSION_PERCENT / 100)

export interface BaccaratInput {
  /** Real stake on Player; null when the field is empty. */
  puntata: number | null
  /** Bonus stake on Player, returned with the win as in the sport calculators. */
  bonus: number
  /** Refund received on the Player account when Player loses. */
  rimborso: number
}

export interface BaccaratResult {
  /** Real stake plus bonus: what sits on Player. */
  puntataEffettiva: number
  isRimborso: boolean
  /** Banco stake for equal profit, exact. */
  stakeBanco: number | null
  /** The same rounded to the cent: what goes on the table. */
  stakeBancoRounded: number | null
  /** Gross return of the Player stake (stake plus bonus, doubled). */
  returnPlayer: number | null
  /** Gross return of the rounded Banco stake. */
  returnBanco: number | null
  profitIfPlayer: number | null
  profitIfBanco: number | null
  guadagnoMinimo: number | null
  /** ratingPercent(2, 1.95): the same for every stake. */
  rating: number | null
  /** guadagnoMinimo / rimborso · 100, only in rimborso mode. */
  crPercent: number | null
  showSummary: boolean
}

export function computeBaccarat(input: BaccaratInput): BaccaratResult {
  const puntata = input.puntata ?? 0
  const { bonus, rimborso } = input
  const puntataEffettiva = puntata + bonus
  const isRimborso = rimborso > 0
  const validAmounts = puntata >= 0 && bonus >= 0 && rimborso >= 0 && puntataEffettiva > 0

  let stakeBanco: number | null = null
  if (validAmounts) {
    stakeBanco = isRimborso
      ? stakeBFromStakeARimborso(
          puntataEffettiva,
          BACCARAT_PLAYER_ODDS,
          BACCARAT_BANCO_ODDS,
          rimborso,
        )
      : stakeBFromStakeA(puntataEffettiva, BACCARAT_PLAYER_ODDS, BACCARAT_BANCO_ODDS)
  }
  const stakeBancoRounded = stakeBanco != null ? round2(stakeBanco) : null

  const returnPlayer = stakeBancoRounded != null ? puntataEffettiva * BACCARAT_PLAYER_ODDS : null
  const returnBanco = stakeBancoRounded != null ? stakeBancoRounded * BACCARAT_BANCO_ODDS : null
  const profitIfPlayer =
    returnPlayer != null && stakeBancoRounded != null
      ? returnPlayer - puntata - stakeBancoRounded
      : null
  const profitIfBanco =
    returnBanco != null && stakeBancoRounded != null
      ? returnBanco - stakeBancoRounded - puntata + rimborso
      : null
  const guadagnoMinimo =
    profitIfPlayer != null && profitIfBanco != null ? Math.min(profitIfPlayer, profitIfBanco) : null
  const rating = ratingPercent(BACCARAT_PLAYER_ODDS, BACCARAT_BANCO_ODDS)
  const crPercent = isRimborso && guadagnoMinimo != null ? (guadagnoMinimo / rimborso) * 100 : null
  const showSummary = validAmounts && stakeBancoRounded != null && guadagnoMinimo != null

  return {
    puntataEffettiva,
    isRimborso,
    stakeBanco,
    stakeBancoRounded,
    returnPlayer,
    returnBanco,
    profitIfPlayer,
    profitIfBanco,
    guadagnoMinimo,
    rating,
    crPercent,
    showSummary,
  }
}

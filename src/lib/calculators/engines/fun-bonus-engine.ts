/**
 * Target per un fun bonus: quanto deve valere il saldo prima di passare a
 * spin bassi per finire il rollover con, in attesa, ancora il bonus da
 * convertire.
 *
 *   wag effettivo   = bonus × rollover ÷ contribuzione
 *   residuo         = wag effettivo − già giocato (mai sotto zero)
 *   perdita attesa  = residuo × (1 − RTP)
 *   target          = bonus massimo ottenibile + perdita attesa
 *
 * Contribuzione e RTP sono in percento (50 → 50%). Se il bonus massimo
 * ottenibile manca, vale il bonus erogato.
 */

export interface FunBonusInput {
  /** Bonus erogato (base del rollover), €. */
  bonus: number | null
  /** Rollover richiesto, in multipli del bonus (35 → 35x). */
  rollover: number | null
  /** Contribuzione del gioco al rollover, % (100 = piena). */
  contribuzionePercent: number | null
  /** RTP della slot usata per il rollover, %. */
  rtpPercent: number | null
  /** Somma già giocata verso il rollover, €. */
  giaGiocato: number | null
  /** Tetto convertibile del bonus, €; null = bonus erogato. */
  bonusMassimo: number | null
}

export interface FunBonusResult {
  /** Rollover effettivo in multipli del bonus, tenendo conto della contribuzione. */
  rolloverEffettivo: number | null
  /** Importo totale da giocare, €. */
  wagTotale: number | null
  /** Importo ancora da giocare, €. */
  wagResiduo: number | null
  /** Perdita attesa sul residuo, €. */
  perditaAttesa: number | null
  /** Bonus usato nel target (massimo ottenibile o erogato), €. */
  bonusConvertibile: number | null
  /** Saldo minimo con cui iniziare il rollover a spin bassi, €. */
  target: number | null
}

const EMPTY: FunBonusResult = {
  rolloverEffettivo: null,
  wagTotale: null,
  wagResiduo: null,
  perditaAttesa: null,
  bonusConvertibile: null,
  target: null,
}

function positive(n: number | null): n is number {
  return n != null && Number.isFinite(n) && n > 0
}

function nonNegative(n: number | null): n is number {
  return n != null && Number.isFinite(n) && n >= 0
}

export function computeFunBonus(input: FunBonusInput): FunBonusResult {
  const { bonus, rollover, contribuzionePercent, rtpPercent } = input
  if (!positive(bonus) || !positive(rollover) || !positive(contribuzionePercent)) return EMPTY
  if (!nonNegative(rtpPercent) || rtpPercent > 100 || contribuzionePercent > 100) return EMPTY

  const rolloverEffettivo = rollover / (contribuzionePercent / 100)
  const wagTotale = bonus * rolloverEffettivo
  const giaGiocato = nonNegative(input.giaGiocato) ? input.giaGiocato : 0
  const wagResiduo = Math.max(0, wagTotale - giaGiocato)
  const perditaAttesa = wagResiduo * (1 - rtpPercent / 100)
  const bonusConvertibile = nonNegative(input.bonusMassimo) ? input.bonusMassimo : bonus
  const target = bonusConvertibile + perditaAttesa

  return { rolloverEffettivo, wagTotale, wagResiduo, perditaAttesa, bonusConvertibile, target }
}

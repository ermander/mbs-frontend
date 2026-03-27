/**
 * Unified event type for the Multipla feature.
 * Supports both punta-banca (oddsmatcher) and punta-punta (dutcher) events.
 *
 * For coverage calculation:
 * - Punta-banca: layStake = (S * mainOdd) / (coverOdd - commission)
 * - Punta-punta: counterStake = (S * mainOdd) / coverOdd  (commission = 0)
 *
 * Both formulas are identical when commissionPercent = 0.
 */
export interface MultiplaEvent {
  type: 'punta-banca' | 'punta-punta'
  home: string
  away: string
  date: string
  hour: string
  competition: string
  market: string
  selection: string
  mainOdd: string
  coverOdd: string
  bookId1: string
  bookId2: string
  commissionPercent: number
}

export function multiplaEventKey(e: MultiplaEvent): string {
  return `${e.date}|${e.hour}|${e.home}|${e.away}|${e.market}|${e.selection}|${e.bookId1}|${e.bookId2}`
}

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
  /** The old scanner's sport id ('0' calcio, '1' tennis, '2' basket) or the Profit Tracker sport ('calcio', …) on scanner v2 events. */
  sport: string
  home: string
  away: string
  /** Local kickoff date, YYYY-MM-DD. */
  date: string
  /** Local kickoff time, HH:MM (the old scanner also uses HH.MM). */
  hour: string
  competition: string
  market: string
  selection: string
  mainOdd: string
  /**
   * The price the hedge maths needs: the lay price on a punta-banca event, the
   * back price of the cover on a punta-punta event — net of the commission
   * when that cover sits on an exchange (scanner v2).
   */
  coverOdd: string
  bookId1: string
  bookId2: string
  commissionPercent: number
  /** Scanner v2 (§14.99): kickoff as ISO, for ordering and for the Profit Tracker payload. */
  startTimeIso?: string
  /** Scanner v2: the cover price as the user sees it on the exchange (gross), when `coverOdd` is net. */
  coverOddGross?: string
  /** Scanner v2: whether the cover sits on an exchange (a back bet there is commissioned). */
  coverIsExchange?: boolean
  /** Scanner v2: the outcome the cover bets on (the opposite outcome on a punta-punta event). */
  coverSelection?: string
  /** Scanner v2: display names of the two bookmakers (bookId1/bookId2 hold their slugs). */
  bookName1?: string
  bookName2?: string
}

export function multiplaEventKey(e: MultiplaEvent): string {
  return `${e.date}|${e.hour}|${e.home}|${e.away}|${e.market}|${e.selection}|${e.bookId1}|${e.bookId2}`
}

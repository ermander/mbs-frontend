import { dutchRating } from '@/lib/calculators/engines/odds'
import { ageSeconds } from '@/lib/matcher/format'
import type { ResultBttsLeg, ResultBttsRow, ToolMarketKey } from '@/types/result-btts'

/**
 * Pure helpers of «Risultato + Goal» (§14.122, §14.173, §14.174): the two
 * markets the tool compares, their names, the legs of a row for the
 * calculator (the backend labels them: «1 & GG», «Over 2.5 & GG», «1-0»)
 * and the row key. The rule is one: every result but the 0-0 is covered,
 * the 0-0 is refunded by the bookmaker.
 */

export interface ToolMarketDef {
  key: ToolMarketKey
  /** The name in the market select. */
  name: string
  /** The market as the Profit Tracker payloads and the calculator header name it; the line is added by resultBttsMarketLabel. */
  shortLabel: string
  /** How the 0-0 is named on this market, for the hints. */
  zeroZeroLabel: string
}

export const TOOL_MARKETS: Record<ToolMarketKey, ToolMarketDef> = {
  result_btts: {
    key: 'result_btts',
    name: '1X2 + Goal/NoGoal',
    shortLabel: '1X2 + GG/NG',
    zeroZeroLabel: 'X & NG',
  },
  total_btts: {
    key: 'total_btts',
    name: 'Totale gol + Goal/NoGoal + Risultato esatto',
    shortLabel: 'U/O + GG/NG + Ris. esatto',
    zeroZeroLabel: '0-0',
  },
}

export const TOOL_MARKET_LIST: readonly ToolMarketDef[] = [
  TOOL_MARKETS.result_btts,
  TOOL_MARKETS.total_btts,
]

export function isToolMarketKey(value: string): value is ToolMarketKey {
  return Object.prototype.hasOwnProperty.call(TOOL_MARKETS, value)
}

/** "1X2 + GG/NG", "U/O 2.5 + GG/NG + Ris. esatto": the market of a row, with its line. */
export function resultBttsMarketLabel(row: Pick<ResultBttsRow, 'marketKey' | 'line'>): string {
  if (row.marketKey === 'total_btts' && row.line != null) {
    return `U/O ${row.line} + GG/NG + Ris. esatto`
  }
  return TOOL_MARKETS[row.marketKey].shortLabel
}

/** The covered legs of a row; a row with a price that is not a price yields none. */
export function resultBttsLegs(row: Pick<ResultBttsRow, 'legs'>): ResultBttsLeg[] {
  if (row.legs.length < 2 || row.legs.some((leg) => !(leg.odds > 1))) return []
  return row.legs
}

/** 100 / Σ 1/q over the legs, as the backend rates the row; null when the row has no usable legs. */
export function resultBttsRating(row: Pick<ResultBttsRow, 'legs'>): number | null {
  const legs = resultBttsLegs(row)
  if (legs.length === 0) return null
  return dutchRating(legs.map((leg) => leg.odds))
}

/** One row per (canonical market, bookmaker): a total with two lines is two rows of the same event. */
export function resultBttsRowKey(
  row: Pick<ResultBttsRow, 'canonicalMarketId' | 'bookmakerSlug'>,
): string {
  return `${row.canonicalMarketId}|${row.bookmakerSlug}`
}

/** Age in seconds of the oldest leg price of the row. */
export function resultBttsRowAge(row: Pick<ResultBttsRow, 'lastSeenAt'>, nowMs: number): number {
  return ageSeconds(row.lastSeenAt, nowMs)
}

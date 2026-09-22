import { dutchRating } from '@/lib/calculators/engines/odds'
import { ageSeconds } from '@/lib/matcher/format'
import {
  BTTS_HALVES_OUTCOME_KEYS,
  RESULT_BTTS_OUTCOME_KEYS,
  TOTAL_BTTS_OUTCOME_KEYS,
  type ResultBttsOutcomeKey,
  type ResultBttsRow,
  type ToolMarketKey,
} from '@/types/result-btts'

/**
 * Pure helpers of «Risultato + Goal» (§14.122, §14.173): the three markets
 * the tool compares, their outcomes and labels, the default outcome left out
 * of each (the page lets the user pick another one, or none), the legs of a
 * row for the calculator and the row key. The backend applies the same
 * defaults (TOOL_MARKETS in result-btts.service.ts).
 */

export interface ToolMarketDef {
  key: ToolMarketKey
  /** The name in the market select. */
  name: string
  /** The market as the Profit Tracker payloads and the calculator header name it; the line is appended by resultBttsMarketLabel. */
  shortLabel: string
  outcomes: readonly ResultBttsOutcomeKey[]
  labels: Partial<Record<ResultBttsOutcomeKey, string>>
  defaultExcluded: ResultBttsOutcomeKey
  /** What the default exclusion means, for the page's hints («X & NG» is the 0-0). */
  excludedHints: Partial<Record<ResultBttsOutcomeKey, string>>
}

export const TOOL_MARKETS: Record<ToolMarketKey, ToolMarketDef> = {
  result_btts: {
    key: 'result_btts',
    name: '1X2 + Goal/NoGoal',
    shortLabel: '1X2 + GG/NG',
    outcomes: RESULT_BTTS_OUTCOME_KEYS,
    labels: {
      home_yes: '1 & GG',
      home_no: '1 & NG',
      draw_yes: 'X & GG',
      draw_no: 'X & NG',
      away_yes: '2 & GG',
      away_no: '2 & NG',
    },
    defaultExcluded: 'draw_no',
    excludedHints: { draw_no: '(0-0)' },
  },
  total_btts: {
    key: 'total_btts',
    name: 'Totale gol + Goal/NoGoal',
    shortLabel: 'U/O + GG/NG',
    outcomes: TOTAL_BTTS_OUTCOME_KEYS,
    labels: {
      over_yes: 'Over & GG',
      over_no: 'Over & NG',
      under_yes: 'Under & GG',
      under_no: 'Under & NG',
    },
    defaultExcluded: 'over_no',
    excludedHints: {},
  },
  btts_halves: {
    key: 'btts_halves',
    name: 'Goal/NoGoal 1° e 2° tempo',
    shortLabel: 'GG/NG 1T + 2T',
    outcomes: BTTS_HALVES_OUTCOME_KEYS,
    labels: {
      yes_yes: '1T GG & 2T GG',
      yes_no: '1T GG & 2T NG',
      no_yes: '1T NG & 2T GG',
      no_no: '1T NG & 2T NG',
    },
    defaultExcluded: 'yes_yes',
    excludedHints: { yes_yes: '(GG in entrambi i tempi)' },
  },
}

export const TOOL_MARKET_LIST: readonly ToolMarketDef[] = [
  TOOL_MARKETS.result_btts,
  TOOL_MARKETS.total_btts,
  TOOL_MARKETS.btts_halves,
]

/** The original rule of the first market: «X & NG», the 0-0, left out. */
export const RESULT_BTTS_EXCLUDED: ResultBttsOutcomeKey = TOOL_MARKETS.result_btts.defaultExcluded

/** The five compared outcomes of the result market with its default exclusion, in page order. */
export const RESULT_BTTS_COMPARED: readonly ResultBttsOutcomeKey[] = comparedKeys(
  'result_btts',
  RESULT_BTTS_EXCLUDED,
)

export function toolMarket(key: ToolMarketKey): ToolMarketDef {
  return TOOL_MARKETS[key]
}

export function isToolMarketKey(value: string): value is ToolMarketKey {
  return Object.prototype.hasOwnProperty.call(TOOL_MARKETS, value)
}

/** The outcomes compared: every outcome of the market but the excluded one (all when none is excluded). */
export function comparedKeys(
  market: ToolMarketKey,
  excluded: ResultBttsOutcomeKey | null,
): ResultBttsOutcomeKey[] {
  return TOOL_MARKETS[market].outcomes.filter((key) => key !== excluded)
}

export function outcomeLabel(market: ToolMarketKey, key: ResultBttsOutcomeKey): string {
  return TOOL_MARKETS[market].labels[key] ?? key
}

/** «(0-0)» next to «X & NG»; empty for an outcome without a hint. */
export function excludedHint(market: ToolMarketKey, key: ResultBttsOutcomeKey | null): string {
  return key ? (TOOL_MARKETS[market].excludedHints[key] ?? '') : ''
}

/** "1X2 + GG/NG", "U/O 2.5 + GG/NG", "GG/NG 1T + 2T": the market of a row, with its line. */
export function resultBttsMarketLabel(row: Pick<ResultBttsRow, 'marketKey' | 'line'>): string {
  const def = TOOL_MARKETS[row.marketKey]
  if (row.marketKey === 'total_btts' && row.line != null) return `U/O ${row.line} + GG/NG`
  return def.shortLabel
}

export interface ResultBttsLeg {
  key: ResultBttsOutcomeKey
  label: string
  odds: number
  lastSeenAt: string
}

/** The compared legs of a row; a row with a missing one is not a comparison and yields none. */
export function resultBttsLegs(
  row: Pick<ResultBttsRow, 'prices' | 'marketKey' | 'excludedOutcome'>,
): ResultBttsLeg[] {
  const legs: ResultBttsLeg[] = []
  for (const key of comparedKeys(row.marketKey, row.excludedOutcome)) {
    const price = row.prices[key]
    if (!price || !(price.odds > 1)) return []
    legs.push({
      key,
      label: outcomeLabel(row.marketKey, key),
      odds: price.odds,
      lastSeenAt: price.lastSeenAt,
    })
  }
  return legs
}

/** 100 / Σ 1/q over the compared prices, as the backend rates the row; null when one is missing. */
export function resultBttsRating(
  row: Pick<ResultBttsRow, 'prices' | 'marketKey' | 'excludedOutcome'>,
): number | null {
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

/** Age in seconds of the oldest compared price of the row. */
export function resultBttsRowAge(row: Pick<ResultBttsRow, 'lastSeenAt'>, nowMs: number): number {
  return ageSeconds(row.lastSeenAt, nowMs)
}

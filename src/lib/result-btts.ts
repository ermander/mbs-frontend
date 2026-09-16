import { dutchRating } from '@/lib/calculators/engines/odds'
import { ageSeconds } from '@/lib/matcher/format'
import type { ResultBttsOutcomeKey, ResultBttsRow } from '@/types/result-btts'

/**
 * Pure helpers of «Risultato + Goal» (§14.122): which outcomes are compared
 * (five of six: «X & NG», the 0-0, stays out by the user's rule), their
 * labels, the legs of a row for the calculator and the row key.
 */

export const RESULT_BTTS_EXCLUDED: ResultBttsOutcomeKey = 'draw_no'

/** The five compared outcomes, in the order the table and the calculator show them. */
export const RESULT_BTTS_COMPARED: readonly ResultBttsOutcomeKey[] = [
  'home_yes',
  'home_no',
  'draw_yes',
  'away_yes',
  'away_no',
]

export const RESULT_BTTS_OUTCOME_LABELS: Record<ResultBttsOutcomeKey, string> = {
  home_yes: '1 & GG',
  home_no: '1 & NG',
  draw_yes: 'X & GG',
  draw_no: 'X & NG',
  away_yes: '2 & GG',
  away_no: '2 & NG',
}

export interface ResultBttsLeg {
  key: ResultBttsOutcomeKey
  label: string
  odds: number
  lastSeenAt: string
}

/** The five compared legs of a row; a row with a missing one is not a comparison and yields none. */
export function resultBttsLegs(row: Pick<ResultBttsRow, 'prices'>): ResultBttsLeg[] {
  const legs: ResultBttsLeg[] = []
  for (const key of RESULT_BTTS_COMPARED) {
    const price = row.prices[key]
    if (!price || !(price.odds > 1)) return []
    legs.push({
      key,
      label: RESULT_BTTS_OUTCOME_LABELS[key],
      odds: price.odds,
      lastSeenAt: price.lastSeenAt,
    })
  }
  return legs
}

/** 100 / Σ 1/q over the five compared prices, as the backend rates the row; null when one is missing. */
export function resultBttsRating(row: Pick<ResultBttsRow, 'prices'>): number | null {
  const legs = resultBttsLegs(row)
  if (legs.length !== RESULT_BTTS_COMPARED.length) return null
  return dutchRating(legs.map((leg) => leg.odds))
}

export function resultBttsRowKey(row: Pick<ResultBttsRow, 'eventId' | 'bookmakerSlug'>): string {
  return `${row.eventId}|${row.bookmakerSlug}`
}

/** Age in seconds of the oldest compared price of the row. */
export function resultBttsRowAge(row: Pick<ResultBttsRow, 'lastSeenAt'>, nowMs: number): number {
  return ageSeconds(row.lastSeenAt, nowMs)
}

import { dutchRating } from '@/lib/calculators/engines/odds'
import { ageSeconds } from '@/lib/matcher/format'
import type { ResultBttsLeg, ResultBttsRow } from '@/types/result-btts'

/**
 * Pure helpers of «Risultato + Goal» (§14.122, §14.177): the market's names,
 * the legs of a row for the calculator (labelled by the backend), the row
 * key and the whole-day bounds of the date filter. The rule is one: the five
 * outcomes but «X & NG» are covered, the 0-0 is refunded by the bookmaker.
 */

/** The market as the page, the calculator and the Profit Tracker payloads name it. */
export const RESULT_BTTS_MARKET_LABEL = '1X2 + GG/NG'
/** How the bookmaker names the 0-0 on this market. */
export const RESULT_BTTS_ZERO_ZERO_LABEL = 'X & NG'

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

export function resultBttsRowKey(row: Pick<ResultBttsRow, 'eventId' | 'bookmakerSlug'>): string {
  return `${row.eventId}|${row.bookmakerSlug}`
}

/** Age in seconds of the oldest leg price of the row. */
export function resultBttsRowAge(row: Pick<ResultBttsRow, 'lastSeenAt'>, nowMs: number): number {
  return ageSeconds(row.lastSeenAt, nowMs)
}

/** «2026-09-25»: the value of a day option, a local calendar day. */
export function localDayValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export interface DayOption {
  /** «2026-09-25» */
  value: string
  /** «gio 25/09» */
  label: string
}

/**
 * The days the «Dal giorno» / «Al giorno» selects offer (§14.179): today and
 * the next `count − 1` local days, so the filter is a pick, never typed. The
 * feed lists about two weeks of fixtures.
 */
export function dayOptions(nowMs: number, count = 15): DayOption[] {
  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const options: DayOption[] = []
  for (let i = 0; i < count; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    options.push({
      value: localDayValue(day),
      label: day.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      }),
    })
  }
  return options
}

/**
 * The bounds of a whole local day for the kickoff filter: «2026-09-25» (the
 * value of a day option) → from its first instant to its last, in the
 * browser's time zone, as ISO strings. Null when the value is not a date.
 */
export function localDayBounds(date: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const from = new Date(year, month - 1, day, 0, 0, 0, 0)
  const to = new Date(year, month - 1, day, 23, 59, 59, 999)
  if (Number.isNaN(from.getTime()) || from.getDate() !== day) return null
  return { from: from.toISOString(), to: to.toISOString() }
}

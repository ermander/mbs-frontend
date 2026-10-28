import { ageSeconds } from '@/lib/matcher/format'
import type { RefundZeroLine, RefundZeroRow } from '@/types/refund-zero'

/**
 * Pure helpers of «Rimborso 0-0» (§14.288): the row key, the age of a row,
 * the money and percent formats of the table and the parsing of the two
 * knobs the user types (stake, commission). The formula lives in the
 * backend; the page only shows its numbers.
 */

export const DEFAULT_REFUND_ZERO_STAKE = 100
/** Percent, as typed: «2» = 2 %. */
export const DEFAULT_REFUND_ZERO_COMMISSION_PCT = 2

export function refundZeroRowKey(
  row: Pick<RefundZeroRow, 'eventId' | 'market' | 'backBookmaker' | 'layBookmaker'>,
): string {
  return `${row.eventId}|${row.market}|${row.backBookmaker.slug}|${row.layBookmaker.slug}`
}

/** Age in seconds of the oldest price of the best line. */
export function refundZeroRowAge(row: Pick<RefundZeroRow, 'lastSeenAt'>, nowMs: number): number {
  return ageSeconds(row.lastSeenAt, nowMs)
}

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** «+2,19 €», «−5,80 €», «0,00 €». */
export function formatSignedEuro(value: number): string {
  const text = euro.format(Math.abs(value))
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

/** «98,64 €» */
export function formatEuro(value: number): string {
  return euro.format(value)
}

/** «+2,19 %» */
export function formatSignedPct(value: number): string {
  const text = `${Math.abs(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

/** Green from the first cent of profit, red at a loss, plain at zero. */
export function profitTone(profit: number): 'positive' | 'negative' | 'neutral' {
  if (profit > 0) return 'positive'
  if (profit < 0) return 'negative'
  return 'neutral'
}

/** The stake the user types: a positive number, else the default. */
export function parseStake(value: string): number {
  const n = parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REFUND_ZERO_STAKE
}

/** The commission the user types, in percent («2», «4,5»): 0 to 20, else the default. */
export function parseCommissionPct(value: string): number {
  const n = parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 20 ? n : DEFAULT_REFUND_ZERO_COMMISSION_PCT
}

/** The lines of a row other than the best, for the detail. */
export function refundZeroOtherLines(row: Pick<RefundZeroRow, 'best' | 'lines'>): RefundZeroLine[] {
  return row.lines.filter((line) => line.outcomeKey !== row.best.outcomeKey)
}

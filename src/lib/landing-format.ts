/**
 * Formattazione all'italiana dei numeri della landing, ripresa da components/core/format.js del
 * design system OddWise (Claude Design, §14.248): importi con il segno esplicito e lo spazio
 * unificatore prima dell'euro, quote a due decimali, rating a un decimale con il segno di percento.
 */

const nf2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const MINUS = '−'
const NBSP = ' '

/** "+1.250,00 €" · "−3,15 €" · con { sign: false } il più sparisce. */
export function formatMoney(value: number, opts: { sign?: boolean } = {}): string {
  const n = Number.isFinite(value) ? value : 0
  const abs = nf2.format(Math.abs(n))
  let sign = ''
  if (n < 0) sign = MINUS
  else if (n > 0 && opts.sign !== false) sign = '+'
  return `${sign}${abs}${NBSP}€`
}

/** "2,10" */
export function formatOdds(value: number): string {
  return nf2.format(Number.isFinite(value) ? value : 0)
}

/** "97,4 %" */
export function formatRating(value: number): string {
  return `${nf1.format(Number.isFinite(value) ? value : 0)}${NBSP}%`
}

import { multiplaLayStakes, type MultiplaHedgeResult } from '@/lib/calculators/multipla'
import { grossOdds, round2 } from '@/lib/calculators/engines/odds'
import { legIsExchange, sportDisplay } from '@/lib/bookmakers'
import type { MatcherMeta, MatcherResult } from '@/types/matcher'
import type { MultiplaEvent } from '@/types/multipla-event'
import { marketLabel, outcomeName } from './format'

/**
 * The Multipla of the scanner v2 (§14.99): the rows of the store become the
 * events of the old scanner's Multipla, with the chosen book on the punta
 * side and the other leg as the cover. Two-way rows only: the hedge maths
 * covers one event with one bet, a three-way row would need two.
 */

/** Local date and time of an ISO kickoff, the way the old scanner keys its events. */
export function localDateHour(iso: string): { date: string; hour: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/**
 * The row as a Multipla event with `bookSlug` on the punta side; null when
 * the row cannot join a multipla with that book.
 */
export function matcherRowToMultiplaEvent(
  row: MatcherResult,
  bookSlug: string,
  meta: MatcherMeta | null | undefined,
  commissionPercent: number,
): MultiplaEvent | null {
  if (row.matchType === 'dutch_3way') return null
  const { date, hour } = localDateHour(row.startTime)
  const base = {
    sport: sportDisplay(row.sportName).ptSport,
    home: row.homeName ?? '?',
    away: row.awayName ?? '?',
    date,
    hour,
    competition: row.competitionName,
    market: marketLabel(row.marketTypeKey, row.line, row),
    startTimeIso: new Date(row.startTime).toISOString(),
  }
  if (row.matchType === 'back_lay') {
    const [back, lay] = row.legs
    if (!back || !lay || back.bookmakerSlug !== bookSlug) return null
    return {
      ...base,
      type: 'punta-banca',
      selection: outcomeName(back),
      mainOdd: back.odds.toFixed(2),
      coverOdd: lay.odds.toFixed(2),
      bookId1: back.bookmakerSlug,
      bookId2: lay.bookmakerSlug,
      commissionPercent,
      coverIsExchange: true,
      coverSelection: outcomeName(lay),
      bookName1: back.bookmakerName,
      bookName2: lay.bookmakerName,
    }
  }
  const puntaIndex = row.legs.findIndex((l) => l.bookmakerSlug === bookSlug)
  if (puntaIndex < 0 || row.legs.length !== 2) return null
  const punta = row.legs[puntaIndex]
  const cover = row.legs[1 - puntaIndex]
  const coverExchange = legIsExchange(cover, meta)
  return {
    ...base,
    type: 'punta-punta',
    selection: outcomeName(punta),
    mainOdd: punta.odds.toFixed(2),
    coverOdd: coverExchange ? cover.odds.toFixed(3) : cover.odds.toFixed(2),
    bookId1: punta.bookmakerSlug,
    bookId2: cover.bookmakerSlug,
    commissionPercent: coverExchange ? commissionPercent : 0,
    coverIsExchange: coverExchange,
    coverOddGross: coverExchange
      ? round2(grossOdds(cover.odds, commissionPercent)).toFixed(2)
      : cover.odds.toFixed(2),
    coverSelection: outcomeName(cover),
    bookName1: punta.bookmakerName,
    bookName2: cover.bookmakerName,
  }
}

export interface MultiplaEligibility {
  ok: boolean
  /** Why the row cannot be added, for the tooltip; null when it can. */
  reason: string | null
}

const kickoffMs = (e: MultiplaEvent): number =>
  e.startTimeIso
    ? Date.parse(e.startTimeIso)
    : Date.parse(`${e.date}T${e.hour.replace('.', ':')}:00`)

/**
 * Whether a row can be ticked: one book chosen, the book on the punta side,
 * room left, not the same event twice, and a kickoff after every event
 * already chosen (the hedges are placed one after the other, as each event
 * settles). A row already in the multipla is always eligible (to untick it).
 */
export function multiplaEligibility(
  row: MatcherResult,
  bookSlug: string | null,
  selected: MultiplaEvent[],
  numEventi: number,
  meta: MatcherMeta | null | undefined,
  selectedKeys: Set<string>,
  rowKey: string,
): MultiplaEligibility {
  if (selectedKeys.has(rowKey)) return { ok: true, reason: null }
  if (!bookSlug)
    return { ok: false, reason: 'Scegli un solo book nel filtro Book per comporre la multipla' }
  if (row.matchType === 'dutch_3way')
    return { ok: false, reason: 'Le tre vie non entrano in una multipla' }
  const event = matcherRowToMultiplaEvent(row, bookSlug, meta, 0)
  if (!event) return { ok: false, reason: 'Il book scelto non è sul lato della puntata' }
  if (selected.length >= numEventi)
    return { ok: false, reason: `Hai già scelto ${numEventi} eventi` }
  if (
    selected.some(
      (e) =>
        e.home === event.home && e.away === event.away && e.startTimeIso === event.startTimeIso,
    )
  ) {
    return { ok: false, reason: 'Questo evento è già nella multipla' }
  }
  const lastKickoff = selected.reduce((max, e) => Math.max(max, kickoffMs(e)), 0)
  if (selected.length > 0 && kickoffMs(event) <= lastKickoff) {
    return { ok: false, reason: 'Deve iniziare dopo l’ultimo evento scelto' }
  }
  return { ok: true, reason: null }
}

export interface MultiplaSummary {
  /** Product of the per-event ratings (percent), as the old panel shows it. */
  rating: number | null
  quotaTotale: number | null
  /** Profit when the multipla wins, after every hedge cost; null without a stake. */
  guadagno: number | null
  hedges: MultiplaHedgeResult[]
}

/** Sorted by kickoff: the order the hedges are placed in. */
export function sortedByKickoff(events: MultiplaEvent[]): MultiplaEvent[] {
  return [...events].sort((a, b) => kickoffMs(a) - kickoffMs(b))
}

export function multiplaSummary(
  events: MultiplaEvent[],
  stake: number | null,
  bonus: number,
  rimborso: number,
): MultiplaSummary {
  if (events.length === 0) return { rating: null, quotaTotale: null, guadagno: null, hedges: [] }
  const sorted = sortedByKickoff(events)
  let product = 1
  let quota = 1
  for (const ev of sorted) {
    const main = Number.parseFloat(ev.mainOdd)
    const cover = Number.parseFloat(ev.coverOdd)
    const c = ev.commissionPercent / 100
    if (!Number.isFinite(main) || !Number.isFinite(cover) || cover <= 0) {
      return { rating: null, quotaTotale: null, guadagno: null, hedges: [] }
    }
    quota *= main
    if (ev.type === 'punta-punta') {
      if (cover <= 1) return { rating: null, quotaTotale: null, guadagno: null, hedges: [] }
      product *= (main * (cover - 1)) / cover
    } else {
      const coverEffective = cover - c
      if (coverEffective <= 0)
        return { rating: null, quotaTotale: null, guadagno: null, hedges: [] }
      product *= (main * (1 - c)) / coverEffective
    }
  }
  const backStakeTotale = (stake ?? 0) + bonus
  if (backStakeTotale <= 0)
    return { rating: product * 100, quotaTotale: quota, guadagno: null, hedges: [] }
  const hedges = multiplaLayStakes(
    backStakeTotale,
    quota,
    sorted.map((ev) => ({
      type: ev.type,
      coverOdds: Number.parseFloat(ev.coverOdd),
      commissionPercent: ev.commissionPercent,
    })),
    rimborso,
  )
  const totalHedgeCost = hedges.reduce((sum, r) => sum + r.hedgeCost, 0)
  return {
    rating: product * 100,
    quotaTotale: quota,
    guadagno: backStakeTotale * quota - (stake ?? 0) - totalHedgeCost,
    hedges,
  }
}

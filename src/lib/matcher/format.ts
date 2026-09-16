import type { MatchType, MatcherLeg } from '@/types/matcher'

/**
 * Labels and ages of the matcher rows, shared by the scanner v2 table, its
 * calculators and the Profit Tracker payloads. Pure.
 */

// A price older than this is worth a second look before betting on it.
export const STALE_LEG_SECONDS = 180
export const OLD_LEG_SECONDS = 600

export const MATCH_TYPE_OPTIONS: Array<{ value: MatchType | ''; label: string }> = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'back_lay', label: 'Punta / Banca' },
  { value: 'dutch_2way', label: 'Dutch 2 vie' },
  { value: 'dutch_3way', label: 'Dutch 3 vie' },
]

export function matchTypeLabel(type: MatchType): string {
  switch (type) {
    case 'dutch_2way':
      return 'Dutch 2W'
    case 'dutch_3way':
      return 'Dutch 3W'
    case 'back_lay':
      return 'Punta/Banca'
  }
}

const MARKET_LABELS: Record<string, string> = {
  '1x2': '1X2',
  over_under: 'O/U',
  btts: 'GG/NG',
  draw_no_bet: 'DNB',
  odd_even: 'Pari/Dispari',
  handicap_european: 'Handicap EU',
  handicap_asian: 'Handicap AS',
  double_chance: 'Doppia Chance',
  result_btts: '1X2 + GG/NG',
}

const PERIOD_LABELS: Record<string, string> = {
  first_half: '1° tempo',
  second_half: '2° tempo',
  extra_time: 'suppl.',
}

export interface MarketScope {
  handicap?: number | null
  periodScope?: string | null
  teamScope?: string | null
}

/** "O/U 2.5 · 1° tempo", "Handicap EU -1", "GG/NG": a comparison is readable for what it is (§14.76). */
export function marketLabel(key: string, line: number | null, scope?: MarketScope): string {
  let label = MARKET_LABELS[key] ?? key
  if (line != null) label += ` ${line}`
  const handicap = scope?.handicap
  if (handicap != null) label += ` ${handicap > 0 ? '+' : ''}${handicap}`
  if (scope?.teamScope) label += ` ${scope.teamScope}`
  const period = scope?.periodScope
  if (period && period !== 'full_time') label += ` · ${PERIOD_LABELS[period] ?? period}`
  return label
}

/** The outcome without the BACK/LAY prefix a back/lay row puts on its legs. */
export function outcomeName(leg: Pick<MatcherLeg, 'outcomeLabel'>): string {
  return leg.outcomeLabel.replace(/^(BACK|LAY)\s+/, '')
}

export function isLayLeg(leg: Pick<MatcherLeg, 'outcomeLabel'>): boolean {
  return leg.outcomeLabel.startsWith('LAY ')
}

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Kickoff date only, with the year: «20/09/2026». */
export function formatKickoffDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Kickoff time only: «20:45». */
export function formatKickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatKickoffLong(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Seconds elapsed since an ISO timestamp, never negative. */
export function ageSeconds(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000))
}

export function ageLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
}

export type AgeTone = 'fresh' | 'aging' | 'old'

/**
 * Tone of a price age. Near kickoff the fixed thresholds apply (3 and 10
 * minutes, a 15-minute tolerance behind them); when the backend says the
 * event's prices are re-read more slowly (`staleAfterSeconds`, up to 2 h for
 * a match weeks away) the same proportions scale with that tolerance, so a
 * price seen 40 minutes ago for a match in October is not painted red.
 */
export function ageTone(seconds: number, staleAfterSeconds?: number): AgeTone {
  const scale = staleAfterSeconds && staleAfterSeconds > 900 ? staleAfterSeconds / 900 : 1
  if (seconds < STALE_LEG_SECONDS * scale) return 'fresh'
  if (seconds < OLD_LEG_SECONDS * scale) return 'aging'
  return 'old'
}

export function ageClass(seconds: number, staleAfterSeconds?: number): string {
  switch (ageTone(seconds, staleAfterSeconds)) {
    case 'fresh':
      return 'text-emerald-400'
    case 'aging':
      return 'text-amber-400'
    case 'old':
      return 'text-red-400'
  }
}

/** Stable identity of a row across polls (the store has no row id in the API). */
export function matcherRowKey(r: {
  eventId: string
  canonicalMarketId?: string | null
  marketTypeKey: string
  line: number | null
  matchType: MatchType
  legs: Array<Pick<MatcherLeg, 'bookmakerSlug' | 'outcomeKey'>>
}): string {
  const legs = r.legs.map((l) => `${l.bookmakerSlug}:${l.outcomeKey}`).join('+')
  return `${r.eventId}|${r.canonicalMarketId ?? `${r.marketTypeKey}:${r.line ?? ''}`}|${r.matchType}|${legs}`
}

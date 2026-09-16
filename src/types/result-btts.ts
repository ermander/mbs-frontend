/**
 * «Risultato + Goal» (§14.122): the Result & Both Teams To Score market
 * compared inside one bookmaker, «X & NG» left out. Mirrors the backend
 * (resources/odds-collection/tools/result-btts.service.ts).
 */

export const RESULT_BTTS_OUTCOME_KEYS = [
  'home_yes',
  'home_no',
  'draw_yes',
  'draw_no',
  'away_yes',
  'away_no',
] as const
export type ResultBttsOutcomeKey = (typeof RESULT_BTTS_OUTCOME_KEYS)[number]

export interface ResultBttsPrice {
  odds: number
  label: string
  /** ISO: when the bookmaker last confirmed this price. */
  lastSeenAt: string
}

export interface ResultBttsRow {
  eventId: string
  bookmakerId: string
  bookmakerSlug: string
  bookmakerName: string
  eventUrl: string | null
  canonicalMarketId: string
  homeName: string | null
  awayName: string | null
  /** ISO kickoff. */
  startTime: string
  sportName: string
  competitionId: string
  competitionName: string
  nationName: string | null
  nationCode: string | null
  /** The five compared outcomes are always present; «draw_no» when the bookmaker prices it. */
  prices: Partial<Record<ResultBttsOutcomeKey, ResultBttsPrice>>
  /** 100 / Σ 1/q over the five compared outcomes. */
  rating: number
  /** Σ 1/q over all six outcomes when the sixth is priced, for information. */
  bookSum: number | null
  /** ISO: the oldest of the five compared prices. */
  lastSeenAt: string
  staleAfterSeconds: number
}

export interface ResultBttsCompetition {
  id: string
  name: string
  nationName: string | null
  nationCode: string | null
  sportName: string
  results: number
}

export interface ResultBttsMeta {
  totalResults: number
  bookmakers: Array<{ slug: string; name: string }>
  competitions: ResultBttsCompetition[]
}

export interface ResultBttsResponse {
  results: ResultBttsRow[]
  total: number
  calculatedAt: string
  meta: ResultBttsMeta
}

export interface ResultBttsFilters {
  search?: string
  /** Comma-separated od_competitions ids. */
  competitions?: string
  /** Comma-separated bookmaker slugs. */
  bookmaker?: string
  min_rating?: number
  start_time_from?: string
  start_time_to?: string
  sort_by?: 'rating' | 'start_time'
  sort_dir?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

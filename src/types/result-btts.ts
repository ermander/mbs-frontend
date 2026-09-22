/**
 * «Risultato + Goal» (§14.122, §14.173): a combined market compared inside
 * one bookmaker with one outcome left out. Mirrors the backend
 * (resources/odds-collection/tools/result-btts.service.ts).
 */

export const TOOL_MARKET_KEYS = ['result_btts', 'total_btts', 'btts_halves'] as const
export type ToolMarketKey = (typeof TOOL_MARKET_KEYS)[number]

export const RESULT_BTTS_OUTCOME_KEYS = [
  'home_yes',
  'home_no',
  'draw_yes',
  'draw_no',
  'away_yes',
  'away_no',
] as const
export const TOTAL_BTTS_OUTCOME_KEYS = ['over_yes', 'over_no', 'under_yes', 'under_no'] as const
export const BTTS_HALVES_OUTCOME_KEYS = ['yes_yes', 'yes_no', 'no_yes', 'no_no'] as const
export type ResultBttsOutcomeKey =
  | (typeof RESULT_BTTS_OUTCOME_KEYS)[number]
  | (typeof TOTAL_BTTS_OUTCOME_KEYS)[number]
  | (typeof BTTS_HALVES_OUTCOME_KEYS)[number]

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
  marketKey: ToolMarketKey
  /** The goals line of a «Totale gol + GG/NG» row; null for the other markets. */
  line: number | null
  /** The outcome left out of this row's rating; null when every outcome is compared. */
  excludedOutcome: ResultBttsOutcomeKey | null
  homeName: string | null
  awayName: string | null
  /** ISO kickoff. */
  startTime: string
  sportName: string
  competitionId: string
  competitionName: string
  nationName: string | null
  nationCode: string | null
  /** The market's outcomes: the compared ones are always present, the excluded one when the bookmaker prices it. */
  prices: Partial<Record<ResultBttsOutcomeKey, ResultBttsPrice>>
  /** 100 / Σ 1/q over the compared outcomes. */
  rating: number
  /** Σ 1/q over every outcome of the market when all are priced, for information. */
  bookSum: number | null
  /** ISO: the oldest of the compared prices. */
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
  /** The market of this answer, its outcomes in page order (canonical labels) and the exclusion applied. */
  market: ToolMarketKey
  outcomes: Array<{ key: ResultBttsOutcomeKey; label: string }>
  excludedOutcome: ResultBttsOutcomeKey | null
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
  /** The market compared; `result_btts` when absent. */
  market?: ToolMarketKey
  /** The outcome left out: an outcome key of the market, `none` for no exclusion; the market's default when absent. */
  exclude?: ResultBttsOutcomeKey | 'none'
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

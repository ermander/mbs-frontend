/**
 * «Risultato + Goal» (§14.122, §14.173, §14.174): the dutch over every
 * result but the 0-0 inside one bookmaker, for the bookmakers that refund
 * the stakes on a 0-0. Mirrors the backend
 * (resources/odds-collection/tools/result-btts.service.ts).
 */

export const TOOL_MARKET_KEYS = ['result_btts', 'total_btts'] as const
export type ToolMarketKey = (typeof TOOL_MARKET_KEYS)[number]

export interface ResultBttsPrice {
  odds: number
  label: string
  /** ISO: when the bookmaker last confirmed this price. */
  lastSeenAt: string
}

/** One covered leg: an outcome of a canonical market of the bookmaker (the result, the total or the Correct Score). */
export interface ResultBttsLeg extends ResultBttsPrice {
  marketTypeKey: string
  outcomeKey: string
}

export interface ResultBttsRow {
  eventId: string
  bookmakerId: string
  bookmakerSlug: string
  bookmakerName: string
  eventUrl: string | null
  /** The canonical market the row is built on (the total's, for a total row). */
  canonicalMarketId: string
  marketKey: ToolMarketKey
  /** The goals line of a «Totale gol + GG/NG» row; null for the result market. */
  line: number | null
  homeName: string | null
  awayName: string | null
  /** ISO kickoff. */
  startTime: string
  sportName: string
  competitionId: string
  competitionName: string
  nationName: string | null
  nationCode: string | null
  /** The covered legs, in page order: every one is priced. */
  legs: ResultBttsLeg[]
  /** The 0-0 as the bookmaker prices it («X & NG», or the 0-0 of the Correct Score), for information. */
  zeroZero: ResultBttsPrice | null
  /** 100 / Σ 1/q over the legs. */
  rating: number
  /** Σ 1/q over the legs plus the 0-0 when priced, for information. */
  bookSum: number | null
  /** ISO: the oldest of the legs' prices. */
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
  /** The market of this answer. */
  market: ToolMarketKey
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

export type MatchType = 'dutch_2way' | 'dutch_3way' | 'back_lay'

export interface MatcherLeg {
  bookmakerId: string
  bookmakerSlug: string
  bookmakerName: string
  outcomeKey: string
  outcomeLabel: string
  odds: number
  liquidity?: number | null
  /** last_seen_at (ISO) of the price behind this leg; null for rows built before 2026-09 */
  lastSeenAt?: string | null
}

export interface MatcherResult {
  eventId: string
  marketTypeKey: string
  line: number | null
  matchType: MatchType
  legs: MatcherLeg[]
  rating: number
  homeName: string | null
  awayName: string | null
  startTime: string
  sportName: string
  competitionName: string
  nationName: string | null
  nationCode: string | null
  /** Seconds a leg price may go unconfirmed for this event (15 min near kickoff, up to 2 h far away); absent on rows from older backends. */
  staleAfterSeconds?: number
}

export interface MatcherResultsResponse {
  results: MatcherResult[]
  total: number
  calculatedAt: string | null
}

export interface MatcherMeta {
  totalResults: number
  calculatedAt: string | null
  sports: string[]
  bookmakers: Array<{ slug: string; name: string }>
  marketTypes: string[]
  nations: string[]
}

export interface MatcherFilters {
  sport?: string
  match_type?: MatchType
  market_type?: string
  min_rating?: number
  max_rating?: number
  bookmaker?: string
  nation?: string
  search?: string
  sort_by?: 'rating' | 'start_time'
  sort_dir?: 'ASC' | 'DESC'
  start_time_from?: string
  start_time_to?: string
  limit?: number
  offset?: number
}

export type MatchType = 'dutch_2way' | 'dutch_3way' | 'back_lay'

export interface MatcherLeg {
  bookmakerId: string
  bookmakerSlug: string
  bookmakerName: string
  outcomeKey: string
  outcomeLabel: string
  odds: number
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
}

export interface MatcherFilters {
  sport?: string
  match_type?: MatchType
  market_type?: string
  min_rating?: number
  bookmaker?: string
  search?: string
  sort_by?: 'rating' | 'start_time'
  sort_dir?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

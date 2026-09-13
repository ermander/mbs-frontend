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
  /**
   * Whether the leg sits on an exchange (§14.95). On a dutch row the exchange
   * leg's `odds` is already net of the commission; on a back/lay row the LAY
   * leg is the exchange. Absent on rows served by a backend older than §14.95
   * or cached before it: see `legIsExchange()` in `lib/bookmakers`.
   */
  isExchange?: boolean
}

export interface MatcherResult {
  eventId: string
  marketTypeKey: string
  line: number | null
  /** The canonical market every leg prices; absent on rows from older backends. */
  canonicalMarketId?: string | null
  /** Handicap value for handicap markets (the line stays null there). */
  handicap?: number | null
  /** 'full_time' | 'first_half' | 'second_half' | …; absent on rows from older backends. */
  periodScope?: string | null
  teamScope?: string | null
  matchType: MatchType
  legs: MatcherLeg[]
  rating: number
  homeName: string | null
  awayName: string | null
  startTime: string
  sportName: string
  /** od_competitions.id; null on rows written before migration 0004, absent on older backends. */
  competitionId?: string | null
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

/** One competition present in the current matcher rows (GET /matcher/meta). */
export interface MatcherCompetition {
  id: string
  name: string
  nationName: string | null
  nationCode: string | null
  sportName: string
  /** Matcher rows of this competition when meta was built. */
  results: number
}

export interface MatcherBookmaker {
  slug: string
  name: string
  /** Absent on backends older than §14.95 (or on a meta cached before it). */
  isExchange?: boolean
}

export interface MatcherMeta {
  totalResults: number
  calculatedAt: string | null
  /**
   * Commission the ratings and the net dutch prices were computed with
   * (0.045 = 4.5%); the calculators use the same. Absent on older backends.
   */
  exchangeCommission?: number
  sports: string[]
  bookmakers: MatcherBookmaker[]
  marketTypes: string[]
  nations: string[]
  /** Absent on backends older than migration 0004. */
  competitions?: MatcherCompetition[]
}

export interface MatcherFilters {
  sport?: string
  match_type?: MatchType
  market_type?: string
  min_rating?: number
  max_rating?: number
  /** Rows with at least one leg on this bookmaker (slug). */
  bookmaker?: string
  /** Comma-separated slugs: rows whose EVERY leg sits on one of them (§14.95). */
  allowed_bookmakers?: string
  /** Bounds on the price of the leg the stake goes on (§14.95). */
  min_odds?: number
  max_odds?: number
  nation?: string
  /** Comma-separated od_competitions ids; any of them. */
  competitions?: string
  search?: string
  sort_by?: 'rating' | 'start_time'
  sort_dir?: 'ASC' | 'DESC'
  start_time_from?: string
  start_time_to?: string
  limit?: number
  offset?: number
}

export type MatchType = 'dutch_2way' | 'dutch_3way' | 'back_lay'

export interface MatcherLeg {
  bookmakerId: string
  bookmakerSlug: string
  bookmakerName: string
  outcomeKey: string
  outcomeLabel: string
  odds: number
  /** last_seen_at| null
  /** last_seen_at (ISO) of the price behind this leg; null for rows built before 2026-09 */
  lastSeenAt?: string | null
  /**
   * Whether the leg sits on an exchange (§14.95). On a dutch row the exchange
   * leg's `odds` is already net of the commission; on a back/lay row the LAY
   * leg is the exchange. Absent on rows served by a backend older than §14.95
   * or cached before it: see `legIsExchange()` in `lib/bookmakers`.
   */
  isExchange?: boolean
  /**
   * The event's page on this bookmaker, from the adapters (§14.100); null when
   * the bookmaker has no page format, absent on older backends.
   */
  eventUrl?: string | null
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
  /**
   * The same rows by kind (§14.406), for the three pages of the scanner; a kind with no row is
   * absent. Absent on older backends.
   */
  resultsByType?: Partial<Record<MatchType, number>>
}

export interface MatcherBookmaker {
  slug: string
  name: string
  /** Absent on backends older than §14.95 (or on a meta cached before it). */
  isExchange?: boolean
  /**
   * On a twin brand only (§14.375): the slug of the bookmaker whose prices it serves (Snai →
   * `sisal`, Lottomatica → `goldbet`). The backend reads the twin as that feed and shows its legs
   * under the twin. Absent on older backends, which do not list twins.
   */
  sameOddsAs?: string
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
  /**
   * Per kind of combination (§14.406): its rows and its market types, so that each page of the
   * scanner offers only its own (`scopedMeta`). Absent on older backends and on the free meta.
   */
  byMatchType?: Partial<Record<MatchType, { totalResults: number; marketTypes: string[] }>>
}

export interface MatcherFilters {
  sport?: string
  match_type?: MatchType
  market_type?: string
  min_rating?: number
  max_rating?: number
  /**
   * Comma-separated slugs: rows whose stake leg («Puntata») sits on one of them (§14.386). The
   * backend sends each dutch row back with that leg first, so the table and the calculators show
   * the main book under «Puntata»; a back/lay row keeps the BACK first.
   */
  bookmaker?: string
  /**
   * Comma-separated slugs (§14.102, §14.386): every leg other than the stake leg must sit on one
   * of them, with or without `bookmaker`.
   */
  cover_bookmakers?: string
  /** Comma-separated slugs: rows whose EVERY leg sits on one of them (§14.95). */
  allowed_bookmakers?: string
  /** Bounds on the price of the leg the stake goes on (§14.95): the main book's leg when `bookmaker` is set (§14.386). */
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

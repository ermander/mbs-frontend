/**
 * «Best Odds» (ADAPTER_STATUS §14.390): the answers of GET /odds-collection/best-odds/*.
 * The catalog (sport → nation → competition), the events of a competition, of a sport or of a
 * search, and one event with every market and every bookmaker's prices.
 */

export interface BestOddsCompetition {
  /** od_competitions.id. */
  id: string
  name: string
  /** Upcoming events of the competition that at least one bookmaker prices. */
  events: number
  /** ISO: the kickoff of the first of them. */
  nextStart: string
}

export interface BestOddsNation {
  /** The name as the catalog has it («Italy», «World»); null for a bucket without one. */
  name: string | null
  /** «IT», «GB-ENG»; null for the buckets that are no country («World»). */
  code: string | null
  events: number
  competitions: BestOddsCompetition[]
}

export interface BestOddsSport {
  /** «Football», as the engine names it (sportDisplay translates it). */
  name: string
  events: number
  nations: BestOddsNation[]
}

export interface BestOddsCatalog {
  sports: BestOddsSport[]
  totalEvents: number
  calculatedAt: string
}

export interface BestOddsEventSummary {
  id: string
  /** ISO kickoff. */
  startTime: string
  homeName: string | null
  awayName: string | null
  sportName: string
  competitionId: string
  competitionName: string
  nationName: string | null
  nationCode: string | null
  /** How many bookmakers price the event. */
  bookmakers: number
}

export interface BestOddsEventsResponse {
  events: BestOddsEventSummary[]
  total: number
  limit: number
  offset: number
}

/** One of `competition`, `sport` or `search`; none = every upcoming event. */
export interface BestOddsEventsQuery {
  sport?: string
  competition?: string
  search?: string
  limit?: number
  offset?: number
}

export interface BestOddsBookmaker {
  slug: string
  name: string
  isExchange: boolean
  /** The event's page on the bookmaker, null when there is none. */
  eventUrl: string | null
}

export interface BestOddsOutcome {
  key: string
  label: string
}

export interface BestOddsMarketRow {
  /** BestOddsBookmaker.slug. */
  bookmaker: string
  /** Back price per outcome key; an outcome the bookmaker does not price is absent. */
  odds: Record<string, number>
  /** Lay price per outcome key, only on an exchange that shows one. */
  lay?: Record<string, number>
  /** ISO: when the bookmaker last confirmed the prices of the row. */
  lastSeenAt: string
}

export interface BestOddsMarket {
  /** od_canonical_markets.id. */
  id: string
  marketTypeKey: string
  line: number | null
  handicap: number | null
  /** 'full_time' | 'first_half' | 'second_half' | …; null on the markets with no period. */
  periodScope: string | null
  teamScope: string | null
  outcomes: BestOddsOutcome[]
  rows: BestOddsMarketRow[]
}

export interface BestOddsEventDetail {
  event: BestOddsEventSummary & {
    /** Seconds a price may go unconfirmed for this event: the ages are coloured against it. */
    staleAfterSeconds: number
  }
  bookmakers: BestOddsBookmaker[]
  markets: BestOddsMarket[]
  /** Commission of the exchanges as a fraction (0.045): their back prices are gross of it. */
  exchangeCommission: number
  calculatedAt: string
}

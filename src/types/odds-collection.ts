// --- Tree response ---

export interface TreeCompetition {
  id: string
  name: string
  slug: string
  gender: string | null
  youth: boolean
  eventCount: number
}

export interface TreeCategory {
  id: string
  name: string
  countryCode: string | null
  competitions: TreeCompetition[]
}

export interface TreeSport {
  id: string
  name: string
  slug: string
  categories: TreeCategory[]
}

export interface TreeResponse {
  tree: TreeSport[]
}

// --- Competition events response ---

export interface CompetitionEvent {
  id: string
  startTime: string
  status: string
  homeName: string | null
  awayName: string | null
  venue: string | null
  round: string | null
  seasonName: string | null
  confirmationStatus?: string
  confirmedBookmakerCount?: number
}

export interface CompetitionEventsResponse {
  events: CompetitionEvent[]
  total: number
  limit: number
  offset: number
}

// --- Event matchings response ---

export interface EventBookmaker {
  id: string
  bookmakerSlug: string
  bookmakerName: string
  bookmakerHomeName: string | null
  bookmakerAwayName: string | null
  bookmakerCompetitionName: string | null
  matchStatus: string
  matchMethod: string
  matchConfidence: number
  matchedAt: string
}

export interface EventMatching {
  id: string
  eventId: string
  matchStatus: string
  matchMethod: string
  matchConfidence: number
  matchedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  bookmakerSlug: string
  bookmakerName: string
  bookmakerHomeName: string | null
  bookmakerAwayName: string | null
  bookmakerCompetitionName: string | null
  canonicalHome: string | null
  canonicalAway: string | null
  competitionName: string
  sportName: string
  startTime: string
  eventConfirmationStatus: string
}

export interface MatchingsResponse {
  matchings: EventMatching[]
  total: number
  limit: number
  offset: number
}

// --- Stats response ---

export interface OddsCollectionStats {
  sports: number
  categories: number
  competitions: number
  seasons: number
  events_total: number
  events_scheduled: number
  events_provisional: number
  events_confirmed: number
  participants: number
  participant_aliases: number
  bookmakers_active: number
  bookmakers_scraping: number
  event_mappings: number
  event_mappings_review: number
  latest_odds: number
  latest_odds_active: number
  odds_history: number
}

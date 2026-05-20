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
  externalSource?: 'apisports' | 'bookmaker_only_pending_review'
  providerStatus?: string | null
  apisportsFixtureId?: number | null
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
}

// --- Review queue (orphan bookmaker events) ---

export type ReviewQueueStatus = 'pending' | 'attached' | 'rejected' | 'created_canonical'

export interface ReviewQueueItem {
  id: string
  bookmakerId: string
  bookmakerSlug: string
  scraperRunId: string | null
  bookmakerExternalId: string | null
  bookmakerHomeName: string | null
  bookmakerAwayName: string | null
  bookmakerCompetitionName: string | null
  bookmakerCountryName: string | null
  bookmakerSportName: string | null
  startTime: string | null
  rawEventPayload: Record<string, unknown>
  status: ReviewQueueStatus
  resolvedEventId: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface ReviewQueueListResponse {
  items: ReviewQueueItem[]
}

export interface ReviewQueueStats {
  pending: number
  attached: number
  rejected: number
  createdCanonical: number
}

export interface ProviderBudget {
  date: string
  callsUsed: number
  planDailyLimit: number
  lastCallAt: string | null
}

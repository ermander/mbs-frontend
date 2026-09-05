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

// --- Health report (backoffice «Salute», GET /odds-collection/admin/health) ---

export interface HealthCron {
  name: string
  scheduledAt: string | null
  lastStartAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastError: string | null
  runs: number
  failures: number
  lastDurationMs: number | null
}

export interface HealthAlert {
  key: string
  severity: 'critical' | 'warning'
  title: string
  detail?: string
  since: string
  lastNotifiedAt: string
}

export interface HealthAdapter {
  slug: string
  name: string
  lastCompletedAt: string | null
  lastRunStatus: string | null
  lastRunAt: string | null
  lastError: string | null
  recentRuns: number
  recentFailed: number
  windowRuns: number
  windowEvents: number
  windowOdds: number
  windowMatched: number
  windowOrphaned: number
  schedulable: boolean
  skipReason: string | null
  initialized: boolean
  silentForMinutes: number
  circuitOpenUntil: string | null
  circuitFailures: number | null
  /** 'open' while calls are refused, 'probing' after the cooldown until a call succeeds, null when closed */
  circuitPhase: 'open' | 'probing' | null
}

export interface HealthProviderRun {
  runType: string
  status: string
  startedAt: string
  completedAt: string | null
  leaguesSynced: number
  fixturesUpserted: number
  fixturesUpdated: number
  apiCallsUsed: number
  error: string | null
}

export interface HealthReport {
  now: string
  bootedAt: string
  scrapingGloballyEnabled: boolean
  thresholds: {
    adapterSilenceMinutes: number
    ingestionWindowMinutes: number
    matcherStaleMinutes: number
    matcherRebuildStaleMinutes: number
  }
  alerts: HealthAlert[]
  adapters: HealthAdapter[]
  runs: Array<{
    bookmakerSlug: string
    totalRuns: number
    successRuns: number
    failedRuns: number
    lastRunAt: string | null
    lastStatus: string | null
  }>
  hoursBack: number
  crons: HealthCron[]
  matcher: {
    rows: number
    calculatedAt: string | null
    pendingEvents: number
    rebuild: HealthCron | null
    tick: HealthCron | null
  }
  refresh: { trackedPairs: number; heartbeat: HealthCron | null }
  provider: { budget: ProviderBudget | null; lastRuns: HealthProviderRun[] }
  reviewQueue: Record<string, number>
  coverage: { fixturesNext48h: number; mappedNext48h: number }
  odds: Array<{ slug: string; status: string; rows: number; events: number }>
  storage: { databaseBytes: number; tables: Array<{ name: string; bytes: number; liveRows: number }> }
}

export interface OddsHealthResponse {
  report: HealthReport
}

// --- Metric history (GET /odds-collection/admin/health/history) ---

export interface MetricPoint {
  t: string
  v: number
}

export interface MetricSeries {
  metric: string
  /** '' per le serie globali, altrimenti lo slug del bookmaker. */
  bookmaker: string
  points: MetricPoint[]
}

export interface MetricsHistory {
  hours: number
  stepMinutes: number
  sampleMinutes: number
  retentionDays: number
  series: MetricSeries[]
}

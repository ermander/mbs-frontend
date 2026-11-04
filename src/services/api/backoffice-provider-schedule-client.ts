import { isAxiosError } from 'axios'
import { apiClient } from './client'

// =====================================================================
// Typed client for the backoffice page «Palinsesto API-Football».
// Mirrors the DTOs of ProviderScheduleController on the backend
// (mbs-backend/src/resources/odds-collection/backoffice/provider-schedule.types.ts).
// =====================================================================

export type OdEventStatus =
  'scheduled' | 'live' | 'closed' | 'cancelled' | 'postponed' | 'rescheduled'

export const OD_EVENT_STATUSES: readonly OdEventStatus[] = [
  'scheduled',
  'live',
  'closed',
  'cancelled',
  'postponed',
  'rescheduled',
]

export interface ProviderScheduleFiltersDto {
  from: string | null
  to: string | null
  sportSlug: string | null
  categoryId: string | null
  competitionId: string | null
  status: OdEventStatus | null
  q: string | null
}

export interface ProviderScheduleSportSummaryDto {
  sportId: string
  sportName: string
  sportSlug: string
  sportKey: string | null
  competitions: number
  /** Of those, the ones the bookmakers are read for (§14.86). */
  competitionsScrapeEnabled: number
  competitionsWithFutureFixtures: number
  fixturesTotal: number
  fixturesFuture: number
  fixturesNext7Days: number
  firstStartTime: string | null
  lastStartTime: string | null
  lastSeenAt: string | null
}

export interface ProviderSyncRunDto {
  sportKey: string
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

export interface ProviderStatusCountDto {
  status: OdEventStatus
  providerStatus: string | null
  count: number
}

export interface ProviderScheduleSummaryDto {
  now: string
  sports: ProviderScheduleSportSummaryDto[]
  totals: {
    fixturesTotal: number
    fixturesFuture: number
    fixturesNext7Days: number
    futureWithBookmaker: number
    nonProviderEvents: number
    nonProviderFutureEvents: number
    whitelistedLeagues: number
    whitelistedLeaguesEnabled: number
  }
  futureByStatus: ProviderStatusCountDto[]
  budget: {
    date: string
    callsUsed: number
    planDailyLimit: number
    lastCallAt: string | null
  } | null
  lastRuns: ProviderSyncRunDto[]
}

export interface ProviderScheduleTreeCompetitionDto {
  competitionId: string
  name: string
  apisportsLeagueId: number | null
  fixtureCount: number
  /** Whether the bookmakers are read for this competition (§14.86). */
  scrapeEnabled: boolean
}

export interface ProviderScheduleTreeCategoryDto {
  categoryId: string
  name: string
  countryCode: string | null
  fixtureCount: number
  scrapeEnabledCount: number
  competitions: ProviderScheduleTreeCompetitionDto[]
}

export interface ProviderScheduleTreeSportDto {
  sportId: string
  name: string
  slug: string
  sportKey: string | null
  fixtureCount: number
  scrapeEnabledCount: number
  competitionCount: number
  categories: ProviderScheduleTreeCategoryDto[]
}

export interface ProviderScheduleTreeDto {
  filters: ProviderScheduleFiltersDto
  totalFixtures: number
  totalCompetitions: number
  scrapeEnabledCompetitions: number
  sports: ProviderScheduleTreeSportDto[]
}

/** One competition of the catalog behind «Competizioni da leggere» (§14.87). */
export interface CompetitionCatalogCompetitionDto {
  competitionId: string
  name: string
  apisportsLeagueId: number | null
  scrapeEnabled: boolean
  /** Fixtures from now on, whatever the window of the schedule page. */
  futureFixtures: number
  nextKickoff: string | null
  /** Distinct bookmakers with a non-rejected mapping on a future fixture. */
  bookmakersMapped: number
}

export interface CompetitionCatalogCategoryDto {
  categoryId: string
  name: string
  countryCode: string | null
  competitionCount: number
  scrapeEnabledCount: number
  futureFixtures: number
  competitions: CompetitionCatalogCompetitionDto[]
}

export interface CompetitionCatalogSportDto {
  sportId: string
  name: string
  slug: string
  sportKey: string | null
  competitionCount: number
  scrapeEnabledCount: number
  futureFixtures: number
  categories: CompetitionCatalogCategoryDto[]
}

export interface CompetitionCatalogDto {
  now: string
  totalCompetitions: number
  scrapeEnabledCompetitions: number
  competitionsWithFutureFixtures: number
  sports: CompetitionCatalogSportDto[]
}

/**
 * Which competitions to switch (PATCH /competitions/scrape, §14.86). The
 * selectors are a union and apply to the whole catalog, not only to the
 * competitions in the page's window.
 */
export interface CompetitionScrapeSelection {
  enabled: boolean
  competitionIds?: string[]
  categoryIds?: string[]
  sportIds?: string[]
}

export interface CompetitionScrapeResultDto {
  enabled: boolean
  /** Rows whose flag actually changed. */
  updated: number
  scrapeEnabledTotal: number
  competitionsTotal: number
}

export interface ProviderFixtureDto {
  eventId: string
  apisportsFixtureId: number
  startTime: string
  status: OdEventStatus
  providerStatus: string | null
  sportName: string
  sportSlug: string
  categoryId: string
  categoryName: string
  countryCode: string | null
  competitionId: string
  competitionName: string
  apisportsLeagueId: number | null
  seasonYear: number | null
  round: string | null
  venue: string | null
  homeName: string | null
  awayName: string | null
  homeApisportsTeamId: number | null
  awayApisportsTeamId: number | null
  firstSeenAt: string | null
  lastSeenAt: string | null
  bookmakersMapped: number
  bookmakersWithOdds: number
}

export interface ProviderFixtureListDto {
  filters: ProviderScheduleFiltersDto
  fixtures: ProviderFixtureDto[]
  total: number
  limit: number
  offset: number
}

/** Query parameters accepted by the tree and the fixture list (ISO timestamps). */
export interface ProviderScheduleQuery {
  from?: string
  to?: string
  includePast?: boolean
  sport?: string
  categoryId?: string
  competitionId?: string
  status?: OdEventStatus
  q?: string
  limit?: number
  offset?: number
}

function toParams(query: ProviderScheduleQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    params[key] = value as string | number | boolean
  }
  return params
}

export function extractMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

export async function getProviderScheduleSummary(): Promise<ProviderScheduleSummaryDto> {
  const { data } = await apiClient.get<ProviderScheduleSummaryDto>(
    '/backoffice/provider-schedule/summary',
  )
  return data
}

export async function getProviderScheduleTree(
  query: ProviderScheduleQuery,
): Promise<ProviderScheduleTreeDto> {
  const { data } = await apiClient.get<ProviderScheduleTreeDto>(
    '/backoffice/provider-schedule/tree',
    { params: toParams(query) },
  )
  return data
}

/** The whole catalog with the scrape flag, no time window (§14.87). */
export async function getCompetitionCatalog(): Promise<CompetitionCatalogDto> {
  const { data } = await apiClient.get<CompetitionCatalogDto>(
    '/backoffice/provider-schedule/competitions',
  )
  return data
}

export async function setCompetitionsScrape(
  selection: CompetitionScrapeSelection,
): Promise<CompetitionScrapeResultDto> {
  const { data } = await apiClient.patch<CompetitionScrapeResultDto>(
    '/backoffice/provider-schedule/competitions/scrape',
    selection,
  )
  return data
}

export async function getProviderFixtures(
  query: ProviderScheduleQuery,
): Promise<ProviderFixtureListDto> {
  const { data } = await apiClient.get<ProviderFixtureListDto>(
    '/backoffice/provider-schedule/fixtures',
    { params: toParams(query) },
  )
  return data
}

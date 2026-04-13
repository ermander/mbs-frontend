import { isAxiosError } from 'axios'
import { apiClient } from './client'

// =====================================================================
// Typed client for the backoffice scraper drill-down viewer.
// Mirrors the DTOs exposed by ScraperDrilldownController on the backend
// (backend/src/resources/odds-collection/backoffice/scraper-drilldown.types.ts).
// =====================================================================

export type AdapterType = 'api' | 'playwright' | 'websocket'
export type IngestRunStatus = 'running' | 'completed' | 'failed' | 'partial'
export type OdEventStatus =
  | 'scheduled'
  | 'live'
  | 'closed'
  | 'cancelled'
  | 'postponed'
  | 'rescheduled'
export type OdMatchStatus =
  | 'auto_confirmed'
  | 'high_confidence'
  | 'review_needed'
  | 'rejected'
  | 'manual_confirmed'
export type OdEventConfirmationStatus = 'provisional' | 'confirmed' | 'ambiguous' | 'rejected'
export type OdMarketStatus = 'active' | 'suspended' | 'removed' | 'settled'
export type OdOutcomeStatus = 'active' | 'suspended' | 'removed' | 'won' | 'lost' | 'void'

export interface BookmakerSummaryDto {
  id: string
  slug: string
  name: string
  adapterType: AdapterType
  isActive: boolean
  scrapeEnabled: boolean
  scrapeIntervalSeconds: number
  enabledSports: string[] | null
  mappedSports: string[]
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
  lastRunStatus: IngestRunStatus | null
  futureCompetitionCount: number
  futureEventCount: number
}

export interface BookmakerRefDto {
  id: string
  slug: string
  name: string
}

export interface CompetitionDrilldownItemDto {
  competitionId: string
  competitionName: string
  competitionSlug: string
  categoryName: string | null
  countryCode: string | null
  sportName: string
  sportSlug: string
  eventCount: number
  rawCompetitionName: string | null
}

export interface CompetitionListDto {
  bookmaker: BookmakerRefDto
  competitions: CompetitionDrilldownItemDto[]
  includePast: boolean
}

export interface EventDrilldownItemDto {
  eventId: string
  startTime: string
  status: OdEventStatus
  venue: string | null
  round: string | null
  homeName: string | null
  awayName: string | null
  rawHomeName: string | null
  rawAwayName: string | null
  bookmakerEventExternalId: string | null
  bookmakerEventUrl: string | null
  matchStatus: OdMatchStatus
  matchConfidence: number
  matchMethod: string
  matchedAt: string
  confirmationStatus: OdEventConfirmationStatus | null
  confirmedBookmakerCount: number
}

export interface EventCompetitionContextDto {
  id: string
  name: string
  categoryName: string | null
  sportName: string
}

export interface EventListDto {
  bookmaker: BookmakerRefDto
  competition: EventCompetitionContextDto
  events: EventDrilldownItemDto[]
  includePast: boolean
}

export interface MarketDrilldownItemDto {
  canonicalMarketId: string
  marketTypeKey: string
  marketTypeName: string
  line: number | null
  handicap: number | null
  teamScope: string | null
  periodScope: string | null
  marketStatus: OdMarketStatus
  outcomeCount: number
  activeOutcomeCount: number
  lastSeenAt: string | null
}

export interface MarketEventContextDto {
  id: string
  competitionId: string | null
  competitionName: string | null
  startTime: string
  status: OdEventStatus
  homeName: string | null
  awayName: string | null
  rawHomeName: string | null
  rawAwayName: string | null
  rawCompetitionName: string | null
  matchStatus: OdMatchStatus | null
  matchConfidence: number | null
}

export interface MarketListDto {
  bookmaker: BookmakerRefDto
  event: MarketEventContextDto
  markets: MarketDrilldownItemDto[]
}

export interface OutcomeDrilldownItemDto {
  canonicalOutcomeId: string
  canonicalKey: string
  canonicalLabel: string
  outcomeStatus: OdOutcomeStatus
  decimalValue: number | null
  oddsStatus: OdOutcomeStatus | null
  lastSeenAt: string | null
  scrapedAt: string | null
  version: number | null
  rawOutcomeLabel: string | null
  rawMarketLabel: string | null
}

export interface OutcomeMarketContextDto {
  id: string
  eventId: string
  marketTypeKey: string
  marketTypeName: string
  line: number | null
  handicap: number | null
  teamScope: string | null
  periodScope: string | null
  marketStatus: OdMarketStatus
  rawMarketLabel: string | null
}

export interface OutcomeListDto {
  bookmaker: BookmakerRefDto
  market: OutcomeMarketContextDto
  outcomes: OutcomeDrilldownItemDto[]
}

// -----------------------------------------------------------------
// Error helper: extract a readable message from an axios error
// -----------------------------------------------------------------

export function extractMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

// -----------------------------------------------------------------
// API calls
// -----------------------------------------------------------------

export async function getBookmakerSummary(slug: string): Promise<BookmakerSummaryDto> {
  const { data } = await apiClient.get<BookmakerSummaryDto>(`/backoffice/scrapers/${slug}/summary`)
  return data
}

export async function getScrapedCompetitions(
  slug: string,
  includePast: boolean,
): Promise<CompetitionListDto> {
  const { data } = await apiClient.get<CompetitionListDto>(
    `/backoffice/scrapers/${slug}/competitions`,
    { params: { includePast } },
  )
  return data
}

export async function getScrapedCompetitionEvents(
  slug: string,
  competitionId: string,
  includePast: boolean,
): Promise<EventListDto> {
  const { data } = await apiClient.get<EventListDto>(
    `/backoffice/scrapers/${slug}/competitions/${competitionId}/events`,
    { params: { includePast } },
  )
  return data
}

export async function getScrapedEventMarkets(
  slug: string,
  eventId: string,
): Promise<MarketListDto> {
  const { data } = await apiClient.get<MarketListDto>(
    `/backoffice/scrapers/${slug}/events/${eventId}/markets`,
  )
  return data
}

export async function getScrapedMarketOutcomes(
  slug: string,
  marketId: string,
): Promise<OutcomeListDto> {
  const { data } = await apiClient.get<OutcomeListDto>(
    `/backoffice/scrapers/${slug}/markets/${marketId}/outcomes`,
  )
  return data
}

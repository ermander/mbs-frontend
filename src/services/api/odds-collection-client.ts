import { apiClient } from './client'
import type {
  TreeResponse,
  CompetitionEventsResponse,
  OddsCollectionStats,
  MatchingsResponse,
  EventBookmaker,
} from '@/types/odds-collection'

export async function getEventTree(): Promise<TreeResponse> {
  const response = await apiClient.get<TreeResponse>('/odds-collection/tree')
  return response.data
}

export async function getCompetitionEvents(
  competitionId: string,
  params?: { status?: string; limit?: number; offset?: number },
): Promise<CompetitionEventsResponse> {
  const response = await apiClient.get<CompetitionEventsResponse>(
    `/odds-collection/competitions/${competitionId}/events`,
    { params },
  )
  return response.data
}

export async function getOddsStats(): Promise<OddsCollectionStats> {
  const response = await apiClient.get<OddsCollectionStats>('/odds-collection/stats')
  return response.data
}

export async function getMatchings(params?: {
  limit?: number
  offset?: number
  bookmaker?: string
  match_status?: string
  match_method?: string
  sport?: string
  from?: string
  to?: string
}): Promise<MatchingsResponse> {
  const response = await apiClient.get<MatchingsResponse>('/odds-collection/admin/matchings', {
    params,
  })
  return response.data
}

export async function getEventBookmakers(eventId: string): Promise<EventBookmaker[]> {
  const response = await apiClient.get<{ bookmakers: EventBookmaker[] }>(
    `/odds-collection/admin/events/${eventId}/bookmakers`,
  )
  return response.data.bookmakers
}

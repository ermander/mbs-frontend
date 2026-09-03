import { apiClient } from './client'
import type {
  TreeResponse,
  CompetitionEventsResponse,
  OddsCollectionStats,
  MatchingsResponse,
  EventBookmaker,
  ReviewQueueListResponse,
  ReviewQueueStats,
  ReviewQueueStatus,
  ProviderBudget,
  HealthReport,
  OddsHealthResponse,
  MetricsHistory,
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

// --- Review queue (orphan bookmaker events) ---

export async function getReviewQueue(params?: {
  limit?: number
  offset?: number
  bookmakerId?: string
  status?: ReviewQueueStatus
}): Promise<ReviewQueueListResponse> {
  const response = await apiClient.get<ReviewQueueListResponse>('/odds-collection/review-queue', {
    params,
  })
  return response.data
}

export async function getReviewQueueStats(): Promise<ReviewQueueStats> {
  const response = await apiClient.get<ReviewQueueStats>('/odds-collection/review-queue/stats')
  return response.data
}

export async function attachReviewQueueItem(id: string, eventId: string): Promise<void> {
  await apiClient.post(`/odds-collection/review-queue/${id}/attach`, { eventId })
}

export async function rejectReviewQueueItem(id: string): Promise<void> {
  await apiClient.post(`/odds-collection/review-queue/${id}/reject`)
}

export async function getProviderBudget(): Promise<ProviderBudget> {
  const response = await apiClient.get<ProviderBudget>(
    '/odds-collection/review-queue/provider/budget',
  )
  return response.data
}

export async function triggerProviderSync(
  sportKey: string,
  type: 'catalog' | 'fixtures' | 'status' = 'fixtures',
): Promise<{
  type: string
  leaguesSynced?: number
  upserted?: number
  updated?: number
  apiCalls: number
}> {
  const response = await apiClient.post<{
    type: string
    leaguesSynced?: number
    upserted?: number
    updated?: number
    apiCalls: number
  }>(`/odds-collection/review-queue/provider/sync/${sportKey}`, null, { params: { type } })
  return response.data
}

export async function getOddsHealth(hours = 24): Promise<HealthReport> {
  const response = await apiClient.get<OddsHealthResponse>('/odds-collection/admin/health', {
    params: { hours },
  })
  return response.data.report
}

export async function getOddsHealthHistory(hours = 24): Promise<MetricsHistory> {
  const response = await apiClient.get<MetricsHistory>('/odds-collection/admin/health/history', {
    params: { hours },
  })
  return response.data
}

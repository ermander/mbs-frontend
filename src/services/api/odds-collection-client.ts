import { apiClient } from './client'
import type {
  TreeResponse,
  CompetitionEventsResponse,
  OddsCollectionStats,
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

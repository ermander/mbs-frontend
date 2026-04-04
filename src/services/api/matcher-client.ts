import { apiClient } from './client'
import type { MatcherResultsResponse, MatcherMeta, MatcherFilters } from '@/types/matcher'

export async function getMatcherResults(filters: MatcherFilters): Promise<MatcherResultsResponse> {
  const response = await apiClient.get<MatcherResultsResponse>('/odds-collection/matcher/results', {
    params: filters,
  })
  return response.data
}

export async function getMatcherMeta(): Promise<MatcherMeta> {
  const response = await apiClient.get<MatcherMeta>('/odds-collection/matcher/meta')
  return response.data
}

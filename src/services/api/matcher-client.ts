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

/**
 * The free Oddsmatcher for visitors who are not logged in (§14.339): no login needed, the scope
 * (back on Snai, lay on an exchange: the Sisal feed's prices, shown as Snai) is fixed by the
 * backend, which reads only
 * the price bounds, the kickoff window, the sort and the page of `filters`.
 */
export async function getFreeMatcherResults(
  filters: MatcherFilters,
): Promise<MatcherResultsResponse> {
  const response = await apiClient.get<MatcherResultsResponse>(
    '/odds-collection/matcher/free/results',
    { params: filters },
  )
  return response.data
}

/** The meta of the free scope: only the free book and the exchanges, no filter lists. */
export async function getFreeMatcherMeta(): Promise<MatcherMeta> {
  const response = await apiClient.get<MatcherMeta>('/odds-collection/matcher/free/meta')
  return response.data
}

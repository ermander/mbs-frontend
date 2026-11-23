import axios from 'axios'

import { apiClient } from './client'
import type {
  BestOddsCatalog,
  BestOddsEventDetail,
  BestOddsEventsQuery,
  BestOddsEventsResponse,
} from '@/types/best-odds'

/** Sport → nation → competition, with the number of priced upcoming events of each. */
export async function getBestOddsCatalog(): Promise<BestOddsCatalog> {
  const response = await apiClient.get<BestOddsCatalog>('/odds-collection/best-odds/catalog')
  return response.data
}

/** The priced upcoming events of a competition, of a sport or of a search, by kickoff. */
export async function getBestOddsEvents(
  query: BestOddsEventsQuery,
): Promise<BestOddsEventsResponse> {
  const response = await apiClient.get<BestOddsEventsResponse>(
    '/odds-collection/best-odds/events',
    { params: query },
  )
  return response.data
}

/**
 * One event with its markets and every bookmaker's prices; null when the backend answers 404:
 * the match has kicked off or left the palinsesto.
 */
export async function getBestOddsEvent(id: string): Promise<BestOddsEventDetail | null> {
  try {
    const response = await apiClient.get<BestOddsEventDetail>(
      `/odds-collection/best-odds/events/${encodeURIComponent(id)}`,
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

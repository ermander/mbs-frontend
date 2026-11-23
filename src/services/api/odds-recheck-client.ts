import { apiClient } from './client'
import type { RecheckRequest, RecheckResponse } from '@/types/odds-recheck'

/**
 * «Ricalcola» (ADAPTER_STATUS §14.390): asks the backend to read one event again now from the
 * bookmakers of a combination. Admin-only on the backend, and counted against the user's
 * allowance: the answer carries what is left of it (a 429 carries it too).
 */
export async function recheckOdds(request: RecheckRequest): Promise<RecheckResponse> {
  const response = await apiClient.post<RecheckResponse>('/odds-collection/recheck', request, {
    // The backend waits up to a minute for a busy or slow bookmaker before answering; the /api
    // rewrite is given a little longer than this (proxyTimeout in next.config.ts).
    timeout: 90_000,
  })
  return response.data
}

import { apiClient } from './client'
import type { ResultBttsFilters, ResultBttsResponse } from '@/types/result-btts'

/** GET /api/tools/result-btts: gated by the backend to admins and enabled users (§14.122). */
export async function getResultBttsRows(filters: ResultBttsFilters): Promise<ResultBttsResponse> {
  const { data } = await apiClient.get<ResultBttsResponse>('/tools/result-btts', {
    params: filters,
  })
  return data
}

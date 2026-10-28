import { apiClient } from './client'
import type { RefundZeroFilters, RefundZeroResponse } from '@/types/refund-zero'

/** GET /api/tools/refund-zero: gated by the backend like «Risultato + Goal» (same tool switch, §14.288). */
export async function getRefundZeroRows(filters: RefundZeroFilters): Promise<RefundZeroResponse> {
  const { data } = await apiClient.get<RefundZeroResponse>('/tools/refund-zero', {
    params: filters,
  })
  return data
}

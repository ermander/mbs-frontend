import { apiClient } from '@/services/api/client'
import type { DutcherRow, DutcherParams } from '@/types/dutcher'

const DUTCHER_PATH = '/odds/dutcher'

export async function getDutcher(params?: DutcherParams): Promise<DutcherRow[]> {
  const { data } = await apiClient.post<DutcherRow[]>(DUTCHER_PATH, params)
  return data
}

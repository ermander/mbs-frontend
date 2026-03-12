import { apiClient } from '@/services/api/client'
import type { OddsmatcherRow } from '@/types/oddsmatcher'

const ODDSMATCHER_PATH = '/api/odds/oddsmatcher'

export interface OddsmatcherParams {
  id_book?: string[]
  id_exchange?: string[]
}

export async function getOddsmatcher(params?: OddsmatcherParams): Promise<OddsmatcherRow[]> {
  const searchParams = new URLSearchParams()
  if (params?.id_book?.length) searchParams.set('id_book', params.id_book.join(','))
  if (params?.id_exchange?.length) searchParams.set('id_exchange', params.id_exchange.join(','))
  const query = searchParams.toString()
  const url = query ? `${ODDSMATCHER_PATH}?${query}` : ODDSMATCHER_PATH
  const { data } = await apiClient.get<OddsmatcherRow[]>(url)
  return data
}

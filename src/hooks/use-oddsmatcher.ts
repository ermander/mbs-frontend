'use client'

import { useQuery } from '@tanstack/react-query'
import { getOddsmatcher, type OddsmatcherParams } from '@/services/odds/oddsmatcher'

export const oddsmatcherQueryKey = ['oddsmatcher'] as const

export function useOddsmatcher(params?: OddsmatcherParams) {
  return useQuery({
    queryKey: [...oddsmatcherQueryKey, params ?? {}],
    queryFn: () => getOddsmatcher(params),
  })
}

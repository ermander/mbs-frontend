'use client'

import { useQuery } from '@tanstack/react-query'
import { getDutcher } from '@/services/odds/dutcher'
import type { DutcherParams } from '@/types/dutcher'

export const dutcherQueryKey = ['dutcher'] as const

export function useDutcher(params?: DutcherParams) {
  return useQuery({
    queryKey: [...dutcherQueryKey, params ?? {}],
    queryFn: () => getDutcher(params),
  })
}

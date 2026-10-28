'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { getRefundZeroRows } from '@/services/api/refund-zero-client'
import { localDayBounds } from '@/lib/result-btts'
import { parseCommissionPct, parseStake } from '@/lib/refund-zero'
import type { RefundZeroFilters, RefundZeroMeta, RefundZeroRow } from '@/types/refund-zero'
import {
  EMPTY_REFUND_ZERO_FILTERS,
  RefundZeroFilterBar,
  type RefundZeroUiFilters,
} from './refund-zero-filter-bar'
import { RefundZeroTable } from './refund-zero-table'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 350

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
}

interface Snapshot {
  key: string
  rows: RefundZeroRow[]
  total: number
  meta: RefundZeroMeta | null
  calculatedAt: string | null
  error: string | null
}

/**
 * «Rimborso 0-0» (§14.288): back a score at bet365, lay it and lay the 0-0
 * on Sportmarket. The page loads on mount and on every filter change (the
 * typed stake and commission after a short pause), reloads on demand with
 * «Refresh quote»; no polling. The numbers come from the backend.
 */
export function RefundZeroTool() {
  const [filters, setFiltersState] = useState<RefundZeroUiFilters>(EMPTY_REFUND_ZERO_FILTERS)
  const [page, setPage] = useState(0)
  const [debounced, setDebounced] = useState({
    search: EMPTY_REFUND_ZERO_FILTERS.search,
    stake: EMPTY_REFUND_ZERO_FILTERS.stake,
    commissionPct: EMPTY_REFUND_ZERO_FILTERS.commissionPct,
  })
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const now = useNow(5_000)

  const setFilters = useCallback((patch: Partial<RefundZeroUiFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
    setPage(0)
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(EMPTY_REFUND_ZERO_FILTERS)
    setPage(0)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced({
        search: filters.search,
        stake: filters.stake,
        commissionPct: filters.commissionPct,
      })
      setPage(0)
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [filters.search, filters.stake, filters.commissionPct])

  const query = useMemo<RefundZeroFilters>(() => {
    const q: RefundZeroFilters = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sort_by: filters.sortBy,
      sort_dir: filters.sortBy === 'start_time' ? 'ASC' : 'DESC',
      stake: parseStake(debounced.stake),
      commission: parseCommissionPct(debounced.commissionPct) / 100,
    }
    if (debounced.search) q.search = debounced.search
    if (filters.onlyPositive) q.min_profit = 0.01
    if (filters.market) q.market = filters.market
    const from = localDayBounds(filters.startFrom)
    const to = localDayBounds(filters.startTo)
    if (from) q.start_time_from = from.from
    if (to) q.start_time_to = to.to
    return q
  }, [
    page,
    filters.sortBy,
    filters.market,
    filters.onlyPositive,
    filters.startFrom,
    filters.startTo,
    debounced,
  ])

  const loadKey = `${JSON.stringify(query)}#${refreshTick}`
  useEffect(() => {
    let cancelled = false
    getRefundZeroRows(query)
      .then((res) => {
        if (cancelled) return
        setSnapshot({
          key: loadKey,
          rows: res.results,
          total: res.total,
          meta: res.meta,
          calculatedAt: res.calculatedAt,
          error: null,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error =
          isAxiosError(err) && err.response?.status === 403
            ? 'Strumento non abilitato per questo utente: chiedi a un amministratore.'
            : 'Errore nel caricamento delle partite. Riprova con «Refresh quote».'
        setSnapshot((prev) => ({
          key: loadKey,
          rows: prev?.rows ?? [],
          total: prev?.total ?? 0,
          meta: prev?.meta ?? null,
          calculatedAt: prev?.calculatedAt ?? null,
          error,
        }))
      })
    return () => {
      cancelled = true
    }
  }, [query, loadKey])

  const loading = snapshot?.key !== loadKey
  const rows = snapshot?.rows ?? []
  const total = snapshot?.total ?? 0
  const meta = snapshot?.meta ?? null
  const calculatedAt = snapshot?.calculatedAt ?? null
  const error = snapshot?.error ?? null
  const refresh = useCallback(() => setRefreshTick((tick) => tick + 1), [])
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <RefundZeroFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        onRefresh={refresh}
        meta={meta}
        loading={loading}
        calculatedAt={calculatedAt}
        now={now}
      />
      {error && (
        <p className="rounded-md border border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <RefundZeroTable
        rows={rows}
        now={now}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}

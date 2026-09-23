'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { getResultBttsRows } from '@/services/api/result-btts-client'
import { localDayBounds } from '@/lib/result-btts'
import type { ResultBttsFilters, ResultBttsMeta, ResultBttsRow } from '@/types/result-btts'
import { ResultBttsCalculatorModal } from './result-btts-calculator-modal'
import {
  EMPTY_RESULT_BTTS_FILTERS,
  ResultBttsFilterBar,
  type ResultBttsUiFilters,
} from './result-btts-filter-bar'
import { ResultBttsTable } from './result-btts-table'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 350

/** A ticking clock so the ages on screen keep moving between reloads. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
}

interface Snapshot {
  /** The query (and refresh tick) this answer belongs to. */
  key: string
  rows: ResultBttsRow[]
  total: number
  meta: ResultBttsMeta | null
  calculatedAt: string | null
  error: string | null
}

/**
 * «Risultato + Goal» (§14.122, §14.177): the dutch over the five outcomes of
 * 1X2 + GG/NG but «X & NG» (the 0-0, refunded by the bookmaker), inside one
 * bookmaker. The page loads on mount and on every filter change, and reloads
 * on demand with «Refresh quote»; no polling.
 */
export function ResultBttsTool() {
  const [filters, setFiltersState] = useState<ResultBttsUiFilters>(EMPTY_RESULT_BTTS_FILTERS)
  const [page, setPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // The last answer, keyed by the query (and the refresh tick) it answers: «loading» is
  // the key not matching, no state is set synchronously in the effect (React Compiler rule).
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [calculatorRow, setCalculatorRow] = useState<ResultBttsRow | null>(null)
  const now = useNow(5_000)

  const setFilters = useCallback((patch: Partial<ResultBttsUiFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
    setPage(0)
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(EMPTY_RESULT_BTTS_FILTERS)
    setPage(0)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search)
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [filters.search])

  const query = useMemo<ResultBttsFilters>(() => {
    const q: ResultBttsFilters = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sort_by: filters.sortBy,
      sort_dir: filters.sortBy === 'start_time' ? 'ASC' : 'DESC',
    }
    if (debouncedSearch) q.search = debouncedSearch
    // A day means the whole local day: every kickoff of that date, whatever its hour.
    const from = localDayBounds(filters.startFrom)
    const to = localDayBounds(filters.startTo)
    if (from) q.start_time_from = from.from
    if (to) q.start_time_to = to.to
    return q
  }, [page, filters.sortBy, filters.startFrom, filters.startTo, debouncedSearch])

  const loadKey = `${JSON.stringify(query)}#${refreshTick}`
  useEffect(() => {
    let cancelled = false
    getResultBttsRows(query)
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
            : 'Errore nel caricamento dei confronti. Riprova con «Refresh quote».'
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
      <ResultBttsFilterBar
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
      <ResultBttsTable
        rows={rows}
        now={now}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onOpenCalculator={setCalculatorRow}
      />
      <ResultBttsCalculatorModal row={calculatorRow} onClose={() => setCalculatorRow(null)} />
    </div>
  )
}

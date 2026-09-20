'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { getResultBttsRows } from '@/services/api/result-btts-client'
import { parseNum } from '@/lib/calculators/engines/odds'
import type { SharedAmounts } from '@/lib/matcher/quick-profit'
import type { ResultBttsFilters, ResultBttsMeta, ResultBttsRow } from '@/types/result-btts'
import { ResultBttsCalculatorModal } from './result-btts-calculator-modal'
import {
  EMPTY_RESULT_BTTS_FILTERS,
  RESULT_BTTS_SHARED_KEYS,
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
 * «Risultato + Goal» (§14.122): the Result & Both Teams To Score market of
 * every bookmaker that prices it, compared inside the bookmaker itself with
 * «X & NG» left out. The page loads on mount and on every filter change, and
 * reloads on demand with «Refresh quote»; no polling.
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
    if (
      (Object.keys(patch) as Array<keyof ResultBttsUiFilters>).some(
        (k) => !RESULT_BTTS_SHARED_KEYS.has(k),
      )
    ) {
      setPage(0)
    }
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState((prev) => ({
      ...EMPTY_RESULT_BTTS_FILTERS,
      stake: prev.stake,
      bonus: prev.bonus,
      rimborso: prev.rimborso,
    }))
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
    if (filters.competitionIds.length > 0) q.competitions = filters.competitionIds.join(',')
    if (filters.bookmakers.length > 0) q.bookmaker = filters.bookmakers.join(',')
    const minRating = parseNum(filters.minRating)
    if (minRating != null) q.min_rating = minRating
    if (filters.startFrom) q.start_time_from = new Date(filters.startFrom).toISOString()
    if (filters.startTo) q.start_time_to = new Date(filters.startTo).toISOString()
    return q
  }, [
    page,
    filters.sortBy,
    filters.competitionIds,
    filters.bookmakers,
    filters.minRating,
    filters.startFrom,
    filters.startTo,
    debouncedSearch,
  ])

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
  const shared = useMemo<SharedAmounts>(
    () => ({
      puntata: parseNum(filters.stake),
      bonus: parseNum(filters.bonus) ?? 0,
      rimborso: parseNum(filters.rimborso) ?? 0,
    }),
    [filters.stake, filters.bonus, filters.rimborso],
  )

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
        shared={shared}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onOpenCalculator={setCalculatorRow}
      />
      <ResultBttsCalculatorModal
        row={calculatorRow}
        defaults={{ stake: filters.stake, bonus: filters.bonus, rimborso: filters.rimborso }}
        onClose={() => setCalculatorRow(null)}
      />
    </div>
  )
}

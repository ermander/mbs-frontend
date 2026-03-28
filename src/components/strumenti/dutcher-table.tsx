'use client'

import { useState, useMemo, useEffect, useDeferredValue } from 'react'
import { useDutcher } from '@/hooks/use-dutcher'
import type { DutcherRow, DutcherParams } from '@/types/dutcher'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { Calculator, ChevronLeft, ChevronRight, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { DutcherCalculatorModal } from '@/components/strumenti/dutcher-calculator-modal'
import type { SharedFilters } from '@/types/shared-filters'
import type { MultiplaEvent } from '@/types/multipla-event'
import { multiplaEventKey } from '@/types/multipla-event'
import { ODDSMATCHER_BOOKS_ONLY } from '@/lib/oddsmatcher-books'

const PAGE_SIZE = 25

const SPORT_LABELS: Record<string, { label: string; icon: string }> = {
  '0': { label: 'Calcio', icon: '\u26BD' },
  '1': { label: 'Tennis', icon: '\uD83C\uDFBE' },
  '2': { label: 'Basket', icon: '\uD83C\uDFC0' },
}

function getSportDisplay(sportId: string) {
  return SPORT_LABELS[sportId] ?? { label: `Sport ${sportId}`, icon: '' }
}

function formatDate(date: string, hour: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y} h. ${hour}`
}

function formatRating(rating: number): string {
  return `${rating.toFixed(2)}%`
}

function rowKey(row: DutcherRow, idx: number): string {
  return `${row.data}|${row.ora}|${row.home}|${row.away}|${row.tipo}|${row.id_book1}|${row.id_book2}|${idx}`
}

export function DutcherTable({
  filters,
  onMetadata,
}: {
  filters: SharedFilters
  onMetadata?: (sports: string[], markets: string[]) => void
}) {
  const {
    searchQuery,
    selectedSportIds,
    selectedMarkets,
    minOdds,
    maxOdds,
    startDate,
    endDate,
    minRating,
    multiplaOpen,
    multiplaSelectedEvents,
    multiplaNumEventi,
    multiplaBookId,
    multiplaQuotaMinEvento,
    multiplaQuotaMaxEvento,
    multiplaSportIds,
    multiplaDataInizio,
    multiplaDataFine,
    toggleMultiplaEvent,
    resetFilters: resetSharedFilters,
  } = filters

  const dutcherRowToMultiplaEvent = (row: DutcherRow): MultiplaEvent => ({
    type: 'punta-punta',
    sport: row.sport,
    home: row.home,
    away: row.away,
    date: row.data,
    hour: row.ora,
    competition: row.campionato,
    market: row.tipo,
    selection: `${row.a} / ${row.b}`,
    mainOdd: row.yes,
    coverOdd: row.no,
    bookId1: row.id_book1,
    bookId2: row.id_book2,
    commissionPercent: 0,
  })

  const handleToggleMultipla = (row: DutcherRow) => {
    toggleMultiplaEvent(dutcherRowToMultiplaEvent(row))
  }

  const selectedKeysSet = useMemo(
    () => new Set(multiplaSelectedEvents.map(multiplaEventKey)),
    [multiplaSelectedEvents],
  )

  // ── Tab-specific state ──
  const [page, setPage] = useState(1)
  const [calculatorRow, setCalculatorRow] = useState<DutcherRow | null>(null)
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [selectedSideBookIds, setSelectedSideBookIds] = useState<string[]>([])

  const allSideBookIds = ODDSMATCHER_BOOKS_ONLY.map((b) => b.id)

  const buildDutcherParams = (): DutcherParams => ({
    id_book: selectedBookIds.length === 1 ? selectedBookIds[0] : '0',
    books: allSideBookIds.join(','),
    ...(selectedSideBookIds.length > 0 ? { side_books: selectedSideBookIds.join(',') } : {}),
    length: 50,
    start: 0,
    sports: '0,1,2',
    mercati: 'DC,GG,O15,O25,O35,RIG,TT,TTB',
    sortBy: 'rating',
    sortMode: 'DESC',
  })

  const [committedParams, setCommittedParams] = useState<DutcherParams>(buildDutcherParams)
  const { data, isLoading, isError, error, refetch, isRefetching } = useDutcher(committedParams)

  // Deferred values
  const deferredMinOdds = useDeferredValue(minOdds)
  const deferredMaxOdds = useDeferredValue(maxOdds)
  const deferredMinRating = useDeferredValue(minRating)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const allRows = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (
      typeof data === 'object' &&
      'data' in data &&
      Array.isArray((data as Record<string, unknown>).data)
    ) {
      return (data as Record<string, unknown>).data as DutcherRow[]
    }
    return []
  }, [data])

  // Reset page on filter changes
  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [
    allRows,
    deferredSearchQuery,
    selectedBookIds,
    selectedSideBookIds,
    selectedSportIds,
    selectedMarkets,
    deferredMinRating,
    deferredMinOdds,
    deferredMaxOdds,
    startDate,
    endDate,
  ])

  const resetFilters = () => {
    resetSharedFilters()
    setSelectedBookIds([])
    setSelectedSideBookIds([])
    setCommittedParams(buildDutcherParams())
    queueMicrotask(() => refetch())
  }

  const toggleBook = (id: string) => {
    setSelectedBookIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleSideBook = (id: string) => {
    setSelectedSideBookIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const bookButtonLabel =
    selectedBookIds.length === 0
      ? 'Book'
      : selectedBookIds.length === 1
        ? (ODDSMATCHER_BOOKS_ONLY.find((b) => b.id === selectedBookIds[0])?.name ?? 'Book')
        : `${selectedBookIds.length} book`

  const sideBookButtonLabel =
    selectedSideBookIds.length === 0
      ? 'Side Books'
      : selectedSideBookIds.length === 1
        ? (ODDSMATCHER_BOOKS_ONLY.find((b) => b.id === selectedSideBookIds[0])?.name ??
          'Side Books')
        : `${selectedSideBookIds.length} side books`

  // ── Client-side filtering ──
  const q = deferredSearchQuery.trim().toLowerCase()
  let filteredRows: DutcherRow[] = q
    ? allRows.filter((row) => {
        const eventText = `${row.home} ${row.away}`.toLowerCase()
        const tournament = row.campionato.toLowerCase()
        return eventText.includes(q) || tournament.includes(q)
      })
    : allRows

  if (selectedSportIds.length > 0) {
    const sportSet = new Set(selectedSportIds)
    filteredRows = filteredRows.filter((row) => sportSet.has(row.sport))
  }
  if (selectedMarkets.length > 0) {
    const marketSet = new Set(selectedMarkets)
    filteredRows = filteredRows.filter((row) => marketSet.has(row.tipo))
  }
  if (deferredMinRating.trim() !== '') {
    const minR = parseFloat(deferredMinRating)
    if (!Number.isNaN(minR)) {
      filteredRows = filteredRows.filter((row) => row.rating >= minR)
    }
  }
  if (deferredMinOdds.trim() !== '') {
    const minO = parseFloat(deferredMinOdds)
    if (!Number.isNaN(minO)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.yes) >= minO)
    }
  }
  if (deferredMaxOdds.trim() !== '') {
    const maxO = parseFloat(deferredMaxOdds)
    if (!Number.isNaN(maxO)) {
      filteredRows = filteredRows.filter((row) => parseFloat(row.yes) <= maxO)
    }
  }
  if (startDate.trim() !== '') {
    filteredRows = filteredRows.filter((row) => row.data >= startDate)
  }
  if (endDate.trim() !== '') {
    filteredRows = filteredRows.filter((row) => row.data <= endDate)
  }

  // Multipla filters (when multipla panel is open)
  if (multiplaOpen) {
    if (multiplaBookId) {
      filteredRows = filteredRows.filter((row) => row.id_book1 === multiplaBookId)
    }
    if (multiplaQuotaMinEvento.trim() !== '') {
      const minQ = parseFloat(multiplaQuotaMinEvento)
      if (!Number.isNaN(minQ))
        filteredRows = filteredRows.filter((row) => parseFloat(row.yes) >= minQ)
    }
    if (multiplaQuotaMaxEvento.trim() !== '') {
      const maxQ = parseFloat(multiplaQuotaMaxEvento)
      if (!Number.isNaN(maxQ))
        filteredRows = filteredRows.filter((row) => parseFloat(row.yes) <= maxQ)
    }
    if (multiplaSportIds.length > 0) {
      const sportSet = new Set(multiplaSportIds)
      filteredRows = filteredRows.filter((row) => sportSet.has(row.sport))
    }
    if (multiplaDataInizio.trim() !== '') {
      filteredRows = filteredRows.filter((row) => row.data >= multiplaDataInizio)
    }
    if (multiplaDataFine.trim() !== '') {
      filteredRows = filteredRows.filter((row) => row.data <= multiplaDataFine)
    }
  }

  const sortedRows = [...filteredRows].sort((a, b) => b.rating - a.rating)

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const pagedRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, sortedRows.length)

  const sports = useMemo(() => [...new Set(allRows.map((r) => r.sport))].sort(), [allRows])
  const markets = useMemo(() => [...new Set(allRows.map((r) => r.tipo))].sort(), [allRows])

  useEffect(() => {
    onMetadata?.(sports, markets)
  }, [sports, markets, onMetadata])

  // ── Filter bar ──
  const filtersBar = (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5">
      {/* Tab-specific: Book + Side Books */}
      <SearchableMultiSelect
        options={ODDSMATCHER_BOOKS_ONLY}
        selectedIds={selectedBookIds}
        onToggle={toggleBook}
        buttonLabel={bookButtonLabel}
        searchPlaceholder="Cerca book..."
        searchInputAriaLabel="Filtra book"
        emptyMessage="Nessun book trovato"
        size="sm"
        renderOption={(opt) => (
          <Image
            src={`/loghi_book/${opt.id}.png`}
            alt={opt.name}
            width={80}
            height={24}
            className="h-5 w-auto max-w-[80px] object-contain"
          />
        )}
      />
      <SearchableMultiSelect
        options={ODDSMATCHER_BOOKS_ONLY}
        selectedIds={selectedSideBookIds}
        onToggle={toggleSideBook}
        buttonLabel={sideBookButtonLabel}
        searchPlaceholder="Cerca side book..."
        searchInputAriaLabel="Filtra side book"
        emptyMessage="Nessun book trovato"
        size="sm"
        renderOption={(opt) => (
          <Image
            src={`/loghi_book/${opt.id}.png`}
            alt={opt.name}
            width={80}
            height={24}
            className="h-5 w-auto max-w-[80px] object-contain"
          />
        )}
      />

      <div className="ml-auto flex items-center gap-2">
        <Button
          onClick={() => {
            setCommittedParams(buildDutcherParams())
            queueMicrotask(() => refetch())
          }}
          disabled={isRefetching}
          size="sm"
          className="h-8 text-xs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Reset filtri"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
    </div>
  )

  const loadingBlock = (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-card p-12"
      role="status"
      aria-label="Caricamento dati dutcher"
    >
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">Caricamento quote...</p>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {filtersBar}
        {loadingBlock}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {filtersBar}
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Errore nel caricamento dei dati.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Riprova più tardi.'}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Riprova
          </Button>
        </div>
      </div>
    )
  }

  if (isRefetching) {
    return (
      <div className="space-y-4">
        {filtersBar}
        {loadingBlock}
      </div>
    )
  }

  if (sortedRows.length === 0) {
    return (
      <div className="space-y-4">
        {filtersBar}
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          Nessun dato disponibile.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filtersBar}

      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {pagedRows.map((row, idx) => {
          const { icon: sportIcon } = getSportDisplay(row.sport)
          return (
            <div
              key={rowKey(row, (page - 1) * PAGE_SIZE + idx)}
              className="rounded-xl border border-border bg-card p-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {sportIcon && <span className="text-sm">{sportIcon}</span>}
                    <span className="truncate text-sm font-medium">
                      {row.home} – {row.away}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.campionato} · {row.tipo} · {row.a} / {row.b}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-lg px-2 py-0.5 font-mono text-xs font-semibold',
                    row.rating >= 100
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400',
                  )}
                >
                  {formatRating(row.rating)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Image
                    src={`/loghi_book/${row.id_book1}.png`}
                    alt=""
                    width={60}
                    height={20}
                    className="h-5 w-auto max-w-[60px] object-contain"
                    loading="lazy"
                  />
                  <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-sky-300">
                    {row.yes}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">vs</span>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-sky-300">
                    {row.no}
                  </span>
                  <Image
                    src={`/loghi_book/${row.id_book2}.png`}
                    alt=""
                    width={60}
                    height={20}
                    className="h-5 w-auto max-w-[60px] object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(row.data, row.ora)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Calcolatore"
                  onClick={() => setCalculatorRow(row)}
                >
                  <Calculator className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <table className="w-full min-w-[900px] text-sm [&_tbody_td]:border-b [&_tbody_td]:border-border [&_td:not(:last-child)]:relative [&_td:not(:last-child)]:after:absolute [&_td:not(:last-child)]:after:bottom-2 [&_td:not(:last-child)]:after:right-0 [&_td:not(:last-child)]:after:top-2 [&_td:not(:last-child)]:after:w-px [&_td:not(:last-child)]:after:bg-border/60 [&_td:not(:last-child)]:after:content-[''] [&_th:not(:last-child)]:relative [&_th:not(:last-child)]:after:absolute [&_th:not(:last-child)]:after:bottom-2 [&_th:not(:last-child)]:after:right-0 [&_th:not(:last-child)]:after:top-2 [&_th:not(:last-child)]:after:w-px [&_th:not(:last-child)]:after:bg-border/60 [&_th:not(:last-child)]:after:content-['']">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground">
              <th className="w-10 p-3 text-center font-medium" aria-label="Seleziona" />
              <th className="whitespace-nowrap p-3 text-left font-medium">Data</th>
              <th className="w-12 p-3 text-left font-medium">Sport</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Evento</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Torneo</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Mercato</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Esito</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Book 1</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Quota 1</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Quota 2</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Book 2</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Rating</th>
              <th className="whitespace-nowrap p-3 text-left font-medium">Aggiornamento</th>
              <th className="whitespace-nowrap p-3 text-center font-medium">Calcolatore</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => {
              const evKey = multiplaEventKey(dutcherRowToMultiplaEvent(row))
              const isSelected = selectedKeysSet.has(evKey)
              const wrongBook = multiplaBookId != null && row.id_book1 !== multiplaBookId
              const checkboxDisabled =
                wrongBook || (!isSelected && multiplaSelectedEvents.length >= multiplaNumEventi)
              return (
                <tr
                  key={rowKey(row, (page - 1) * PAGE_SIZE + idx)}
                  className={cn('transition-colors hover:bg-accent', isSelected && 'bg-primary/5')}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={checkboxDisabled}
                      onChange={() => handleToggleMultipla(row)}
                      aria-label={`Seleziona ${row.home} – ${row.away}`}
                    />
                  </td>
                  <td className="whitespace-nowrap p-3 text-center text-muted-foreground">
                    {formatDate(row.data, row.ora)}
                  </td>
                  <td className="p-3 text-center" title={getSportDisplay(row.sport).label}>
                    {(() => {
                      const { icon } = getSportDisplay(row.sport)
                      return icon ? (
                        <span className="text-lg leading-none" aria-hidden>
                          {icon}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.sport}</span>
                      )
                    })()}
                  </td>
                  <td className="p-3 text-center font-medium">
                    {row.home} – {row.away}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{row.campionato}</td>
                  <td className="p-3 text-center">{row.tipo}</td>
                  <td className="p-3 text-center">
                    {row.a} / {row.b}
                  </td>
                  <td className="p-3 text-center after:hidden">
                    <Image
                      src={`/loghi_book/${row.id_book1}.png`}
                      alt={row.book}
                      width={120}
                      height={32}
                      className="mx-auto h-8 w-auto max-w-[120px] object-contain"
                      loading="lazy"
                    />
                  </td>
                  <td className="border-b-0 bg-sky-500/15 p-3 text-center font-medium text-sky-300">
                    {row.yes}
                  </td>
                  <td className="border-b-0 bg-sky-500/15 p-3 text-center font-medium text-sky-300">
                    {row.no}
                  </td>
                  <td className="p-3 text-center">
                    <Image
                      src={`/loghi_book/${row.id_book2}.png`}
                      alt={row.book2}
                      width={120}
                      height={32}
                      className="mx-auto h-8 w-auto max-w-[120px] object-contain"
                      loading="lazy"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={cn(
                        'inline-block rounded px-2 py-1 font-mono font-medium',
                        row.rating >= 100
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400',
                      )}
                    >
                      {formatRating(row.rating)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 text-center text-xs text-muted-foreground">
                    {row.lastupdate}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Apri calcolatore"
                      onClick={() => setCalculatorRow(row)}
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {start}–{end} di {sortedRows.length} risultati
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Pagina precedente"
          >
            <ChevronLeft className="h-4 w-4" />
            Indietro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Pagina successiva"
          >
            Avanti
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <DutcherCalculatorModal
        open={calculatorRow != null}
        onOpenChange={(o) => !o && setCalculatorRow(null)}
        row={calculatorRow}
      />
    </div>
  )
}

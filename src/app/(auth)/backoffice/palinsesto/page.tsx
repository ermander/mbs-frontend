'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Search, X } from 'lucide-react'

import { BoChip, boLink } from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  GCheckbox,
  GSelect,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DS_PANEL, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import {
  extractMessage,
  getProviderFixtures,
  getProviderScheduleSummary,
  getProviderScheduleTree,
  type OdEventStatus,
  type ProviderFixtureListDto,
  type ProviderScheduleQuery,
  type ProviderScheduleSummaryDto,
  type ProviderScheduleTreeDto,
} from '@/services/api/backoffice-provider-schedule-client'
import { ScheduleSummary } from './schedule-summary'
import { ScheduleTree, type ScheduleScope } from './schedule-tree'
import { FixturesTable } from './fixtures-table'
import { addDays, parseLocalDateInput, startOfLocalDay, toDateInputValue } from './format'

const PAGE_SIZE = 100
const SEARCH_DEBOUNCE_MS = 350
const SEARCH_MIN_LENGTH = 2
const CLOCK_MS = 30_000

type Preset = 'today' | 'tomorrow' | '7d' | '30d' | 'future' | 'custom'

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'today', label: 'Oggi' },
  { id: 'tomorrow', label: 'Domani' },
  { id: '7d', label: '7 giorni' },
  { id: '30d', label: '30 giorni' },
  { id: 'future', label: 'Tutto il futuro' },
  { id: 'custom', label: 'Personalizzato' },
]

const STATUS_OPTIONS: Array<{ value: OdEventStatus; label: string }> = [
  { value: 'scheduled', label: 'In programma' },
  { value: 'live', label: 'In corso' },
  { value: 'postponed', label: 'Rinviate' },
  { value: 'rescheduled', label: 'Riprogrammate' },
  { value: 'cancelled', label: 'Annullate' },
  { value: 'closed', label: 'Concluse' },
]

interface WindowSpec {
  from?: string
  to?: string
  includePast?: boolean
}

/**
 * The time window sent to the API. Day boundaries are the viewer's local ones:
 * «oggi» is today in Rome, not in UTC. `includePast` only makes sense where a
 * lower bound exists to lift (the open-ended presets).
 */
function computeWindow(
  preset: Preset,
  fromInput: string,
  toInput: string,
  includePast: boolean,
  now: Date,
): WindowSpec {
  const today = startOfLocalDay(now)
  switch (preset) {
    case 'today':
      return { from: today.toISOString(), to: addDays(today, 1).toISOString() }
    case 'tomorrow':
      return { from: addDays(today, 1).toISOString(), to: addDays(today, 2).toISOString() }
    case '7d':
      return { from: today.toISOString(), to: addDays(today, 7).toISOString() }
    case '30d':
      return { from: today.toISOString(), to: addDays(today, 30).toISOString() }
    case 'future':
      return includePast ? { includePast: true } : { from: today.toISOString() }
    case 'custom': {
      const from = parseLocalDateInput(fromInput)
      const to = parseLocalDateInput(toInput)
      const spec: WindowSpec = {}
      if (from) spec.from = from.toISOString()
      else if (includePast) spec.includePast = true
      else spec.from = today.toISOString()
      if (to) spec.to = addDays(to, 1).toISOString()
      return spec
    }
  }
}

function scopeInTree(tree: ProviderScheduleTreeDto, scope: ScheduleScope): boolean {
  return tree.sports.some((s) =>
    s.categories.some((c) =>
      scope.type === 'category'
        ? c.categoryId === scope.id
        : c.competitions.some((comp) => comp.competitionId === scope.id),
    ),
  )
}

/** A fetch result remembered with the key of the query that produced it. */
interface Keyed<T> {
  key: string
  data: T | null
  error: string | null
}

// Il palinsesto di api-sports com'è nel catalogo canonico. Dal §14.365 sul design OddWise: filtri
// coi campi del design e, sotto i 1024px, l'albero sopra la tabella invece che accanto (sul
// telefono la tabella delle partite restava larga zero accanto all'albero da 352px).
export default function PalinsestoPage() {
  // --- local clock: «oggi» for the window, «visto … fa» for the rows ---
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), CLOCK_MS)
    return () => clearInterval(t)
  }, [])
  // The window is anchored to the day of the last (re)load, not to every clock tick:
  // otherwise the whole page would refetch every 30 s.
  const [anchor, setAnchor] = useState(() => Date.now())

  // --- summary ---
  const [summaryResult, setSummaryResult] = useState<Keyed<ProviderScheduleSummaryDto> | null>(null)
  const [summaryTick, setSummaryTick] = useState(0)

  const loadSummary = useCallback(() => setSummaryTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    const key = String(summaryTick)
    getProviderScheduleSummary()
      .then((data) => {
        if (!cancelled) setSummaryResult({ key, data, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setSummaryResult({
            key,
            data: null,
            error: extractMessage(err, 'Errore nel caricamento del riepilogo.'),
          })
      })
    return () => {
      cancelled = true
    }
  }, [summaryTick])

  const summaryLoading = summaryResult?.key !== String(summaryTick)
  const summary = summaryResult?.data ?? null
  const summaryError = summaryResult?.error ?? null

  // --- filters ---
  const [preset, setPreset] = useState<Preset>('7d')
  const [fromInput, setFromInput] = useState(() => toDateInputValue(new Date()))
  const [toInput, setToInput] = useState('')
  const [includePast, setIncludePast] = useState(false)
  const [sport, setSport] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [scope, setScope] = useState<ScheduleScope | null>(null)

  useEffect(() => {
    if (search === debouncedSearch) return
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search, debouncedSearch])

  const q = debouncedSearch.trim()
  const effectiveQ = q.length >= SEARCH_MIN_LENGTH ? q : undefined

  const baseQuery = useMemo<ProviderScheduleQuery>(() => {
    const spec = computeWindow(preset, fromInput, toInput, includePast, new Date(anchor))
    return {
      ...spec,
      sport: sport || undefined,
      status: (status || undefined) as OdEventStatus | undefined,
      q: effectiveQ,
    }
  }, [preset, fromInput, toInput, includePast, sport, status, effectiveQ, anchor])
  const baseKey = useMemo(() => JSON.stringify(baseQuery), [baseQuery])

  // --- tree ---
  // «Ricarica tutto» bumps the tick: it is part of the key, so the previous
  // tree stays on screen while the next one loads.
  const [treeTick, setTreeTick] = useState(0)
  const treeKey = `${baseKey}:${treeTick}`
  const [treeResult, setTreeResult] = useState<Keyed<ProviderScheduleTreeDto> | null>(null)

  useEffect(() => {
    let cancelled = false
    getProviderScheduleTree(baseQuery)
      .then((data) => {
        if (!cancelled) setTreeResult({ key: treeKey, data, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setTreeResult({
            key: treeKey,
            data: null,
            error: extractMessage(err, 'Errore nel caricamento della navigazione.'),
          })
      })
    return () => {
      cancelled = true
    }
  }, [baseQuery, treeKey])

  const treeLoading = treeResult?.key !== treeKey
  // The previous tree stays on screen while the next one loads.
  const tree = treeResult?.data ?? null

  // A node selected earlier may not exist in the current tree (another window):
  // it is then ignored, and cleared the moment a new node is chosen.
  const effectiveScope = tree && scope && !scopeInTree(tree, scope) ? null : scope

  // --- pagination, reset whenever the query or the scope changes (derived) ---
  const listKey = useMemo(
    () =>
      JSON.stringify({
        baseKey,
        scope: effectiveScope ? `${effectiveScope.type}:${effectiveScope.id}` : null,
      }),
    [baseKey, effectiveScope],
  )
  const [page, setPage] = useState<{ key: string; offset: number }>({ key: '', offset: 0 })
  const offset = page.key === listKey ? page.offset : 0
  const setOffset = (next: number) => setPage({ key: listKey, offset: next })

  // --- fixtures ---
  const [listResult, setListResult] = useState<Keyed<ProviderFixtureListDto> | null>(null)
  const pageKey = `${listKey}:${offset}`

  useEffect(() => {
    let cancelled = false
    const query: ProviderScheduleQuery = {
      ...baseQuery,
      categoryId: effectiveScope?.type === 'category' ? effectiveScope.id : undefined,
      competitionId: effectiveScope?.type === 'competition' ? effectiveScope.id : undefined,
      limit: PAGE_SIZE,
      offset,
    }
    getProviderFixtures(query)
      .then((data) => {
        if (!cancelled) setListResult({ key: pageKey, data, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setListResult({
            key: pageKey,
            data: null,
            error: extractMessage(err, 'Errore nel caricamento delle partite.'),
          })
      })
    return () => {
      cancelled = true
    }
  }, [baseQuery, effectiveScope, offset, pageKey])

  const listLoading = listResult?.key !== pageKey
  const list = listResult?.data ?? null
  const listError = listResult?.error ?? null

  const sportOptions = useMemo(
    () => (summary?.sports ?? []).map((s) => ({ value: s.sportSlug, label: s.sportName })),
    [summary],
  )

  const handleRefresh = () => {
    setAnchor(Date.now())
    setNow(Date.now())
    setTreeTick((t) => t + 1)
    loadSummary()
  }

  const handleSportChange = (value: string) => {
    setSport(value)
    setScope(null)
  }

  const includePastEnabled =
    preset === 'future' || (preset === 'custom' && parseLocalDateInput(fromInput) === null)

  return (
    <>
      <DsPageHeader
        title="Palinsesto API-Football"
        description={
          <>
            Tutte le partite scaricate da api-sports.io così come stanno nel catalogo canonico, con
            i bookmaker che il matcher ha collegato a ciascuna. Le competizioni che gli scraper
            leggono si scelgono in{' '}
            <Link href="/backoffice/competizioni" className={boLink}>
              Competizioni da leggere
            </Link>
            : qui il pallino grigio segna quelle spente.
          </>
        }
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            className={dsButtonClass('secondary', 'md')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Ricarica tutto
          </button>
        }
      />

      <ScheduleSummary
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        now={now}
        onRefresh={loadSummary}
      />

      {/* Filters */}
      <div className={cn(DS_PANEL, 'px-5 py-4')}>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <div className="flex flex-col gap-1">
            <span id="pal-window" className="text-sm leading-5 font-semibold text-ds-ink">
              Finestra
            </span>
            <div role="group" aria-labelledby="pal-window" className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <BoChip key={p.id} pressed={preset === p.id} onClick={() => setPreset(p.id)}>
                  {p.label}
                </BoChip>
              ))}
            </div>
          </div>
          {preset === 'custom' && (
            <>
              <GTextField
                id="pal-from"
                label="Dal"
                type="date"
                size="sm"
                value={fromInput}
                onChange={setFromInput}
                className="w-40"
              />
              <GTextField
                id="pal-to"
                label="Al (incluso)"
                type="date"
                size="sm"
                value={toInput}
                onChange={setToInput}
                className="w-40"
              />
            </>
          )}
          <div
            className="pb-1"
            title="Toglie il limite inferiore: si vede tutto il catalogo, dalla partita più vecchia"
          >
            <GCheckbox
              id="pal-past"
              label="Includi partite passate"
              checked={includePast}
              disabled={!includePastEnabled}
              onChange={setIncludePast}
            />
          </div>
          <GSelect
            id="pal-sport"
            label="Sport"
            size="sm"
            value={sport}
            onChange={handleSportChange}
            options={[{ value: '', label: 'Tutti' }, ...sportOptions]}
            className="w-44"
          />
          <GSelect
            id="pal-status"
            label="Stato"
            size="sm"
            value={status}
            onChange={setStatus}
            options={[{ value: '', label: 'Tutti' }, ...STATUS_OPTIONS]}
            className="w-44"
          />
          <GTextField
            id="pal-q"
            label="Cerca squadra, competizione o id fixture"
            type="search"
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="es. Milan, Serie A, 1234567"
            prefix={<Search className="h-4 w-4" aria-hidden />}
            className="min-w-[16rem] flex-1"
          />
        </div>
        {effectiveScope && (
          <div className="ds-body-sm mt-3 flex flex-wrap items-center gap-2 text-ds-ink-muted">
            Filtro attivo:
            <DsBadge tone="brand">
              {effectiveScope.type === 'category' ? 'nazione' : 'competizione'} ·{' '}
              {effectiveScope.label}
            </DsBadge>
            <button
              type="button"
              className={cn(dsButtonClass('ghost', 'sm'), 'h-7 px-2')}
              onClick={() => setScope(null)}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              togli
            </button>
          </div>
        )}
      </div>

      {/* Master-detail: albero accanto alla tabella da 1024px, sopra la tabella più stretto. */}
      <div className="flex flex-col gap-4 lg:h-[calc(100vh-220px-var(--topnav-h))] lg:min-h-[32rem] lg:flex-row">
        <div className="h-96 lg:h-auto lg:w-88 lg:shrink-0">
          <ScheduleTree
            tree={tree}
            loading={treeLoading}
            error={treeResult?.error ?? null}
            scope={effectiveScope}
            onScopeChange={setScope}
            autoExpand={effectiveQ !== undefined}
          />
        </div>
        <div className="min-w-0 lg:flex-1">
          <FixturesTable
            fixtures={list?.fixtures ?? []}
            total={list?.total ?? 0}
            limit={PAGE_SIZE}
            offset={offset}
            loading={listLoading}
            error={listError}
            now={now}
            onPageChange={setOffset}
          />
        </div>
      </div>
    </>
  )
}

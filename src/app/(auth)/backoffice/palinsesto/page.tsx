'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
    <Container className="max-w-none">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Palinsesto API-Football
          </h2>
          <p className="text-sm text-muted-foreground">
            Tutte le partite scaricate da api-sports.io così come stanno nel catalogo canonico, con
            i bookmaker che il matcher ha collegato a ciascuna. Le competizioni che gli scraper
            leggono si scelgono in{' '}
            <Link href="/backoffice/competizioni" className="underline hover:text-foreground">
              Competizioni da leggere
            </Link>
            : qui il pallino grigio segna quelle spente.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh}>
          Ricarica tutto
        </Button>
      </div>

      <ScheduleSummary
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        now={now}
        onRefresh={loadSummary}
      />

      {/* Filters */}
      <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Finestra</Label>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={preset === p.id ? 'default' : 'outline'}
                  onClick={() => setPreset(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          {preset === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="pal-from" className="text-xs text-muted-foreground">
                  Dal
                </Label>
                <Input
                  id="pal-from"
                  type="date"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="pal-to" className="text-xs text-muted-foreground">
                  Al (incluso)
                </Label>
                <Input
                  id="pal-to"
                  type="date"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="w-40"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="pal-past"
              checked={includePast}
              disabled={!includePastEnabled}
              onChange={(e) => setIncludePast(e.target.checked)}
            />
            <Label
              htmlFor="pal-past"
              className={`text-xs ${includePastEnabled ? 'text-foreground' : 'text-muted-foreground'}`}
              title="Toglie il limite inferiore: si vede tutto il catalogo, dalla partita più vecchia"
            >
              Includi partite passate
            </Label>
          </div>
          <div className="w-44">
            <SearchableSelect
              id="pal-sport"
              label="Sport"
              placeholder="Tutti"
              options={sportOptions}
              value={sport}
              onChange={handleSportChange}
              size="sm"
            />
          </div>
          <div className="w-44">
            <SearchableSelect
              id="pal-status"
              label="Stato"
              placeholder="Tutti"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              size="sm"
            />
          </div>
          <div className="flex min-w-[16rem] flex-1 flex-col gap-1">
            <Label htmlFor="pal-q" className="text-xs text-muted-foreground">
              Cerca squadra, competizione o id fixture
            </Label>
            <Input
              id="pal-q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="es. Milan, Serie A, 1234567"
            />
          </div>
        </div>
        {effectiveScope && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            Filtro attivo:
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-primary">
              {effectiveScope.type === 'category' ? 'nazione' : 'competizione'} ·{' '}
              {effectiveScope.label}
            </span>
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setScope(null)}
            >
              togli
            </button>
          </div>
        )}
      </div>

      {/* Master-detail */}
      <div
        className="flex gap-4"
        style={{ height: 'calc(100vh - 220px - var(--topnav-h))', minHeight: '32rem' }}
      >
        <div className="w-[22rem] shrink-0">
          <ScheduleTree
            tree={tree}
            loading={treeLoading}
            error={treeResult?.error ?? null}
            scope={effectiveScope}
            onScopeChange={setScope}
            autoExpand={effectiveQ !== undefined}
          />
        </div>
        <div className="min-w-0 flex-1">
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
    </Container>
  )
}

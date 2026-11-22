'use client'

import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { getCountryFlagUrl, getCountryFlagUrlFromIso } from '@/lib/country-flags'
import type {
  ProviderScheduleTreeCategoryDto,
  ProviderScheduleTreeDto,
  ProviderScheduleTreeSportDto,
} from '@/services/api/backoffice-provider-schedule-client'
import { num } from './format'

export type ScheduleScope =
  | { type: 'category'; id: string; label: string }
  | { type: 'competition'; id: string; label: string }

/** Countries start open when a sport has at most this many. */
const AUTO_EXPAND_COUNTRIES_MAX = 4

export function ScheduleTree({
  tree,
  loading,
  error,
  scope,
  onScopeChange,
  autoExpand,
}: {
  tree: ProviderScheduleTreeDto | null
  loading: boolean
  error: string | null
  scope: ScheduleScope | null
  onScopeChange: (scope: ScheduleScope | null) => void
  /** True while a text search is active: every branch is opened so matches are visible. */
  autoExpand: boolean
}) {
  // Open/closed is derived: a node is open by default (sports always, countries
  // only when the sport has few) until the user toggles it, and the user's
  // toggles survive a reload of the tree. No effect, no cascading render.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map())

  const toggle = (id: string, defaultOpen: boolean) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(id, !(prev.get(id) ?? defaultOpen))
      return next
    })
  }

  const isSportOpen = (s: ProviderScheduleTreeSportDto) =>
    autoExpand || (overrides.get(s.sportId) ?? true)
  const categoryDefaultOpen = (s: ProviderScheduleTreeSportDto) =>
    s.categories.length <= AUTO_EXPAND_COUNTRIES_MAX
  const isCategoryOpen = (s: ProviderScheduleTreeSportDto, c: ProviderScheduleTreeCategoryDto) =>
    autoExpand || (overrides.get(c.categoryId) ?? categoryDefaultOpen(s))

  const totalLabel = useMemo(
    () =>
      tree
        ? `${num(tree.totalFixtures)} partite · ${num(tree.scrapeEnabledCompetitions)} / ${num(tree.totalCompetitions)} competizioni lette dagli scraper`
        : '',
    [tree],
  )

  return (
    <div className={cn(DS_PANEL, 'flex h-full min-h-0 flex-col overflow-hidden')}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ds-line px-4 py-2.5">
        <div className="min-w-0 text-sm font-semibold text-ds-ink">
          Sport · Nazione · Competizione
          <span className="ds-caption block font-normal text-ds-ink-muted">{totalLabel}</span>
        </div>
        <button
          type="button"
          disabled={!scope}
          onClick={() => onScopeChange(null)}
          className={cn(dsButtonClass(scope ? 'secondary' : 'ghost', 'sm'), 'disabled:opacity-50')}
        >
          Tutte
        </button>
      </div>
      <div className="relative flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="ds-caption absolute top-2 right-3 text-ds-ink-muted">aggiorno…</div>
        )}
        {error ? (
          <p className="px-2 py-4 text-sm text-ds-loss">{error}</p>
        ) : !tree ? (
          <p className="px-2 py-4 text-sm text-ds-ink-muted">
            {loading ? 'Caricamento...' : 'Nessun dato.'}
          </p>
        ) : tree.sports.length === 0 ? (
          <p className="px-2 py-4 text-sm text-ds-ink-muted">
            Nessuna partita api-sports nella finestra scelta.
          </p>
        ) : (
          <ul className="space-y-1">
            {tree.sports.map((s) => (
              <li key={s.sportId}>
                <button
                  type="button"
                  onClick={() => toggle(s.sportId, true)}
                  aria-expanded={isSportOpen(s)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-ds-sm px-2 py-1.5 text-left text-sm font-semibold text-ds-ink transition-colors hover:bg-ds-surface-sunken',
                    dsFocusRing,
                  )}
                >
                  <Caret open={isSportOpen(s)} />
                  <span className="flex-1">{s.name}</span>
                  <Count n={s.fixtureCount} />
                </button>
                {isSportOpen(s) && (
                  <ul className="space-y-0.5 ml-3 border-l border-ds-line pl-2">
                    {s.categories.map((c) => {
                      const selected = scope?.type === 'category' && scope.id === c.categoryId
                      const open = isCategoryOpen(s, c)
                      return (
                        <li key={c.categoryId}>
                          <div
                            className={cn(
                              'flex items-center gap-1 rounded-ds-sm pr-2',
                              selected ? 'bg-ds-brand-soft text-ds-brand' : 'text-ds-ink',
                            )}
                          >
                            <button
                              type="button"
                              aria-label={`${open ? 'Chiudi' : 'Apri'} ${c.name}`}
                              aria-expanded={open}
                              onClick={() => toggle(c.categoryId, categoryDefaultOpen(s))}
                              className={cn(
                                'rounded-ds-xs px-1 py-1 transition-colors hover:bg-ds-surface-sunken',
                                dsFocusRing,
                              )}
                            >
                              <Caret open={open} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onScopeChange(
                                  selected
                                    ? null
                                    : { type: 'category', id: c.categoryId, label: c.name },
                                )
                              }
                              aria-pressed={selected}
                              className={cn(
                                'flex min-w-0 flex-1 items-center gap-2 rounded-ds-xs py-1 text-left text-sm underline-offset-4 hover:underline',
                                dsFocusRing,
                              )}
                              title="Filtra le partite di questa nazione"
                            >
                              <Flag countryCode={c.countryCode} name={c.name} />
                              <span className="flex-1 truncate">{c.name}</span>
                              <Count n={c.fixtureCount} />
                            </button>
                          </div>
                          {open && (
                            <ul className="space-y-0.5 ml-4 border-l border-ds-line pl-2">
                              {c.competitions.map((comp) => {
                                const sel =
                                  scope?.type === 'competition' && scope.id === comp.competitionId
                                return (
                                  <li key={comp.competitionId}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onScopeChange(
                                          sel
                                            ? null
                                            : {
                                                type: 'competition',
                                                id: comp.competitionId,
                                                label: comp.name,
                                              },
                                        )
                                      }
                                      aria-pressed={sel}
                                      className={cn(
                                        'flex w-full items-center gap-2 rounded-ds-sm px-2 py-1 text-left text-sm transition-colors',
                                        dsFocusRing,
                                        sel
                                          ? 'bg-ds-brand-soft text-ds-brand'
                                          : 'text-ds-ink hover:bg-ds-surface-sunken',
                                        !comp.scrapeEnabled && 'opacity-60',
                                      )}
                                      title={
                                        comp.apisportsLeagueId !== null
                                          ? `league id api-sports ${comp.apisportsLeagueId}`
                                          : undefined
                                      }
                                    >
                                      <ScrapeDot enabled={comp.scrapeEnabled} />
                                      <span className="flex-1 truncate">{comp.name}</span>
                                      {comp.apisportsLeagueId !== null && (
                                        <span className="font-mono text-[11px] text-ds-ink-muted">
                                          #{comp.apisportsLeagueId}
                                        </span>
                                      )}
                                      <Count n={comp.fixtureCount} />
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Caret({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={cn('h-4 w-4 shrink-0 text-ds-ink-muted transition-transform', open && 'rotate-90')}
      aria-hidden
    />
  )
}

/**
 * Read-only: whether the scrapers read this competition (§14.86). The
 * selection is made on the page «Competizioni da leggere» (§14.87), which
 * lists the whole catalog; this tree only navigates the fixtures of a window.
 */
function ScrapeDot({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        enabled ? 'bg-ds-profit' : 'bg-ds-line-strong/60',
      )}
      title={
        enabled
          ? 'Gli scraper leggono le quote di questa competizione'
          : 'Competizione spenta: gli scraper non la leggono (Competizioni da leggere)'
      }
      aria-label={enabled ? 'letta dagli scraper' : 'spenta'}
    />
  )
}

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-ds-surface-sunken px-2 py-0.5 text-xs font-normal text-ds-ink-muted tabular-nums">
      {num(n)}
    </span>
  )
}

export function Flag({ countryCode, name }: { countryCode: string | null; name: string }) {
  const url = getCountryFlagUrlFromIso(countryCode) ?? getCountryFlagUrl(name)
  if (!url)
    return (
      <span
        className="inline-block h-3 w-4 shrink-0 rounded-ds-xs bg-ds-surface-sunken"
        aria-hidden
      />
    )
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="inline-block h-3 w-4 shrink-0 rounded-ds-xs object-cover" />
  )
}

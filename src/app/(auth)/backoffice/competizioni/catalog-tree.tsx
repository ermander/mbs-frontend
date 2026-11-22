'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { BoSwitch } from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { getCountryFlagUrl, getCountryFlagUrlFromIso } from '@/lib/country-flags'
import { cn } from '@/lib/utils'
import type {
  CompetitionCatalogCategoryDto,
  CompetitionCatalogDto,
  CompetitionCatalogSportDto,
  CompetitionScrapeSelection,
} from '@/services/api/backoffice-provider-schedule-client'
import { formatDate, num } from '../palinsesto/format'

/**
 * The catalog tree of «Competizioni da leggere» (§14.87): every competition,
 * no time window, one switch each, and two explicit bulk actions per country
 * and per sport («Accendi tutte» / «Spegni tutte»). The counts on a node are
 * the catalog's, not the filtered view's: a bulk action always applies to
 * the whole node, and the label says how many rows that is. Since §14.365 on the OddWise design:
 * BoSwitch, DS badges and buttons; on a phone the bulk actions wrap under the node.
 */
export function CatalogTree({
  catalog,
  autoExpand,
  busy,
  onScrapeChange,
}: {
  /** Already filtered by the page: empty nodes are gone. */
  catalog: CompetitionCatalogDto
  /** True while a search or a filter is active: every branch is opened. */
  autoExpand: boolean
  busy: boolean
  onScrapeChange: (selection: CompetitionScrapeSelection, what: string) => void
}) {
  // Open/closed is derived: sports open, countries closed, until the user
  // toggles; the toggles survive a reload of the catalog.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map())
  const toggle = (id: string, defaultOpen: boolean) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(id, !(prev.get(id) ?? defaultOpen))
      return next
    })
  }
  const isSportOpen = (s: CompetitionCatalogSportDto) =>
    autoExpand || (overrides.get(s.sportId) ?? true)
  const isCategoryOpen = (c: CompetitionCatalogCategoryDto) =>
    autoExpand || (overrides.get(c.categoryId) ?? false)

  if (catalog.sports.length === 0) {
    return (
      <p className="m-0 px-2 py-6 text-center text-sm text-ds-ink-muted">
        Nessuna competizione corrisponde alla ricerca o al filtro.
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {catalog.sports.map((s) => (
        <li key={s.sportId}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-ds-sm pr-2">
            <button
              type="button"
              aria-expanded={isSportOpen(s)}
              onClick={() => toggle(s.sportId, true)}
              className={cn(
                'flex min-w-0 flex-1 basis-56 items-center gap-2 rounded-ds-sm px-2 py-1.5 text-left text-sm font-semibold text-ds-ink transition-colors hover:bg-ds-surface-sunken',
                dsFocusRing,
              )}
            >
              <Caret open={isSportOpen(s)} />
              <span className="flex-1">{s.name}</span>
              <OnCount enabled={s.scrapeEnabledCount} total={s.competitionCount} />
            </button>
            <BulkActions
              enabled={s.scrapeEnabledCount}
              total={s.competitionCount}
              busy={busy}
              onChange={(enabled) =>
                onScrapeChange({ enabled, sportIds: [s.sportId] }, `tutto ${s.name}`)
              }
            />
          </div>
          {isSportOpen(s) && (
            <ul className="space-y-0.5 ml-3 border-l border-ds-line pl-2">
              {s.categories.map((c) => {
                const open = isCategoryOpen(c)
                return (
                  <li key={c.categoryId}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-ds-sm pr-2">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => toggle(c.categoryId, false)}
                        className={cn(
                          'flex min-w-0 flex-1 basis-56 items-center gap-2 rounded-ds-sm px-1 py-1 text-left text-sm text-ds-ink transition-colors hover:bg-ds-surface-sunken',
                          dsFocusRing,
                        )}
                      >
                        <Caret open={open} />
                        <Flag countryCode={c.countryCode} name={c.name} />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span
                          className="text-xs whitespace-nowrap text-ds-ink-muted"
                          title="Partite future"
                        >
                          {num(c.futureFixtures)} partite
                        </span>
                        <OnCount enabled={c.scrapeEnabledCount} total={c.competitionCount} />
                      </button>
                      <BulkActions
                        enabled={c.scrapeEnabledCount}
                        total={c.competitionCount}
                        busy={busy}
                        onChange={(enabled) =>
                          onScrapeChange({ enabled, categoryIds: [c.categoryId] }, c.name)
                        }
                      />
                    </div>
                    {open && (
                      <ul className="space-y-0.5 ml-4 border-l border-ds-line pl-2">
                        {c.competitions.map((comp) => (
                          <li
                            key={comp.competitionId}
                            className={cn(
                              'flex items-center gap-2 rounded-ds-sm px-2 py-1 text-sm',
                              comp.scrapeEnabled ? 'text-ds-ink' : 'text-ds-ink-muted',
                            )}
                          >
                            <ScrapeSwitch
                              checked={comp.scrapeEnabled}
                              name={comp.name}
                              disabled={busy}
                              onChange={(enabled) =>
                                onScrapeChange(
                                  { enabled, competitionIds: [comp.competitionId] },
                                  comp.name,
                                )
                              }
                            />
                            <span className="min-w-0 flex-1 truncate">{comp.name}</span>
                            {comp.apisportsLeagueId !== null && (
                              <span
                                className="hidden font-mono text-[11px] text-ds-ink-muted sm:inline"
                                title="league id api-sports"
                              >
                                #{comp.apisportsLeagueId}
                              </span>
                            )}
                            <span
                              className="w-24 shrink-0 text-right text-xs text-ds-ink-muted tabular-nums"
                              title={
                                comp.nextKickoff
                                  ? `Prossima partita ${formatDate(comp.nextKickoff)}`
                                  : 'Nessuna partita futura in catalogo'
                              }
                            >
                              {comp.futureFixtures > 0
                                ? `${num(comp.futureFixtures)} partite`
                                : 'nessuna partita'}
                            </span>
                            <span
                              className={cn(
                                'hidden w-16 shrink-0 text-right text-xs tabular-nums sm:inline',
                                comp.bookmakersMapped > 0
                                  ? 'font-semibold text-ds-ink'
                                  : 'text-ds-ink-muted',
                              )}
                              title="Bookmaker con partite collegate"
                            >
                              {num(comp.bookmakersMapped)} book
                            </span>
                          </li>
                        ))}
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
  )
}

/** The switch of one competition: the design's BoSwitch, small. */
export function ScrapeSwitch({
  checked,
  name,
  disabled,
  onChange,
}: {
  checked: boolean
  name: string
  disabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <BoSwitch
      size="sm"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      label={`${checked ? 'Smetti di leggere' : 'Leggi'} le quote di ${name}`}
      title={
        checked
          ? 'Gli scraper leggono le quote di questa competizione: clicca per fermarli'
          : 'Gli scraper non leggono questa competizione: clicca per riprendere'
      }
    />
  )
}

/**
 * Two explicit actions, never a toggle that guesses: «Accendi tutte» is
 * disabled when every competition of the node is already on, «Spegni tutte»
 * when none is. Both apply to the whole node in the catalog.
 */
function BulkActions({
  enabled,
  total,
  busy,
  onChange,
}: {
  enabled: number
  total: number
  busy: boolean
  onChange: (enabled: boolean) => void
}) {
  const base = cn(
    dsButtonClass('ghost', 'sm'),
    'h-7 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-40',
  )
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={cn(base, 'text-ds-profit hover:bg-ds-profit-soft hover:text-ds-profit')}
        disabled={busy || enabled === total}
        title={`Leggi tutte le ${num(total)} competizioni di questo nodo`}
        onClick={() => onChange(true)}
      >
        Accendi tutte
      </button>
      <button
        type="button"
        className={cn(base, 'text-ds-ink-muted hover:bg-ds-surface-sunken hover:text-ds-ink')}
        disabled={busy || enabled === 0}
        title={`Smetti di leggere tutte le ${num(total)} competizioni di questo nodo`}
        onClick={() => onChange(false)}
      >
        Spegni tutte
      </button>
    </span>
  )
}

function OnCount({ enabled, total }: { enabled: number; total: number }) {
  const tone: DsBadgeTone =
    total > 0 && enabled === total ? 'profit' : enabled === 0 ? 'neutral' : 'warning'
  return (
    <DsBadge tone={tone} title="Competizioni lette / totali" className="tabular-nums">
      {num(enabled)}/{num(total)}
    </DsBadge>
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

function Flag({ countryCode, name }: { countryCode: string | null; name: string }) {
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

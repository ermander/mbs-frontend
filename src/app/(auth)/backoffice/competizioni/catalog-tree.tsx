'use client'

import { useState } from 'react'
import { getCountryFlagUrl, getCountryFlagUrlFromIso } from '@/lib/country-flags'
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
 * the whole node, and the label says how many rows that is.
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
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        Nessuna competizione corrisponde alla ricerca o al filtro.
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {catalog.sports.map((s) => (
        <li key={s.sportId}>
          <div className="flex items-center gap-2 rounded-md pr-2">
            <button
              type="button"
              onClick={() => toggle(s.sportId, true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold text-foreground hover:bg-accent"
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
            <ul className="ml-3 space-y-0.5 border-l border-border pl-2">
              {s.categories.map((c) => {
                const open = isCategoryOpen(c)
                return (
                  <li key={c.categoryId}>
                    <div className="flex items-center gap-2 rounded-md pr-2">
                      <button
                        type="button"
                        onClick={() => toggle(c.categoryId, false)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-foreground hover:bg-accent"
                      >
                        <Caret open={open} />
                        <Flag countryCode={c.countryCode} name={c.name} />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-[11px] text-muted-foreground" title="Partite future">
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
                      <ul className="ml-4 space-y-0.5 border-l border-border pl-2">
                        {c.competitions.map((comp) => (
                          <li
                            key={comp.competitionId}
                            className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
                              comp.scrapeEnabled ? 'text-foreground' : 'text-muted-foreground'
                            }`}
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
                                className="font-mono text-[10px] text-muted-foreground"
                                title="league id api-sports"
                              >
                                #{comp.apisportsLeagueId}
                              </span>
                            )}
                            <span
                              className="w-24 text-right text-[11px] tabular-nums text-muted-foreground"
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
                              className={`w-16 text-right text-[11px] tabular-nums ${
                                comp.bookmakersMapped > 0
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
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

/** The switch of one competition: a plain button with the switch role. */
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${checked ? 'Smetti di leggere' : 'Leggi'} le quote di ${name}`}
      title={
        checked
          ? 'Gli scraper leggono le quote di questa competizione: clicca per fermarli'
          : 'Gli scraper non leggono questa competizione: clicca per riprendere'
      }
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-emerald-500' : 'bg-muted-foreground/40'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </button>
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
  const base =
    'shrink-0 rounded-md border px-2 py-0.5 text-[11px] transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={`${base} border-emerald-500/40 text-emerald-500`}
        disabled={busy || enabled === total}
        title={`Leggi tutte le ${num(total)} competizioni di questo nodo`}
        onClick={() => onChange(true)}
      >
        Accendi tutte
      </button>
      <button
        type="button"
        className={`${base} border-border text-muted-foreground`}
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
  const tone =
    total > 0 && enabled === total
      ? 'bg-emerald-500/15 text-emerald-500'
      : enabled === 0
        ? 'bg-muted text-muted-foreground'
        : 'bg-amber-500/15 text-amber-500'
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[11px] font-normal tabular-nums ${tone}`}
      title="Competizioni lette / totali"
    >
      {num(enabled)}/{num(total)}
    </span>
  )
}

function Caret({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block w-3 text-xs text-muted-foreground transition-transform ${
        open ? 'rotate-90' : ''
      }`}
      aria-hidden
    >
      ▸
    </span>
  )
}

function Flag({ countryCode, name }: { countryCode: string | null; name: string }) {
  const url = getCountryFlagUrlFromIso(countryCode) ?? getCountryFlagUrl(name)
  if (!url)
    return <span className="inline-block h-3 w-4 shrink-0 rounded-sm bg-muted" aria-hidden />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="inline-block h-3 w-4 shrink-0 rounded-sm object-cover" />
}

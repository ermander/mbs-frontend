'use client'

import { useMemo } from 'react'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import type { SearchableMultiSelectOption } from '@/components/ui/searchable-multi-select'
import type { MatcherCompetition } from '@/types/matcher'

// =====================================================================
// Competition filter of the matcher (Odds Scanner v2 and the backoffice
// Matcher page): a searchable multi-select fed by GET /matcher/meta, so it
// only offers competitions that currently have results. The list follows
// the sport and nation filters already chosen; the search matches the
// competition name, the nation and, when several sports are present, the
// sport («ital» finds every Italian competition).
// =====================================================================

export interface CompetitionScope {
  sport?: string
  nation?: string
}

export function competitionLabel(c: MatcherCompetition, withSport: boolean): string {
  const parts = [c.name]
  if (c.nationName) parts.push(c.nationName)
  if (withSport) parts.push(c.sportName)
  return parts.join(' · ')
}

/** The competitions of `scope`, as options of the multi-select. */
export function competitionOptions(
  competitions: MatcherCompetition[] | undefined,
  scope: CompetitionScope,
): SearchableMultiSelectOption[] {
  const list = (competitions ?? []).filter(
    (c) =>
      (!scope.sport || c.sportName === scope.sport) &&
      (!scope.nation || c.nationName === scope.nation),
  )
  const withSport = new Set(list.map((c) => c.sportName)).size > 1
  return list.map((c) => ({ id: c.id, name: competitionLabel(c, withSport) }))
}

/** Ids still offered under `scope`: a sport or nation change drops the rest. */
export function pruneCompetitionIds(
  selected: string[],
  competitions: MatcherCompetition[] | undefined,
  scope: CompetitionScope,
): string[] {
  if (selected.length === 0) return selected
  const allowed = new Set(competitionOptions(competitions, scope).map((o) => o.id))
  const kept = selected.filter((id) => allowed.has(id))
  return kept.length === selected.length ? selected : kept
}

export function MatcherCompetitionFilter({
  competitions,
  scope,
  selectedIds,
  onToggle,
  className,
}: {
  competitions: MatcherCompetition[] | undefined
  scope: CompetitionScope
  selectedIds: string[]
  onToggle: (id: string) => void
  className?: string
}) {
  const options = useMemo(() => competitionOptions(competitions, scope), [competitions, scope])
  const resultsById = useMemo(
    () => new Map((competitions ?? []).map((c) => [c.id, c.results])),
    [competitions],
  )
  const unsupported = competitions === undefined

  return (
    <SearchableMultiSelect
      className={className}
      options={options}
      selectedIds={selectedIds}
      onToggle={onToggle}
      buttonLabel="Competizioni"
      placeholder={
        unsupported
          ? 'Competizioni (non disponibili)'
          : options.length === 0
            ? 'Nessuna competizione'
            : 'Tutte le competizioni'
      }
      searchPlaceholder="Cerca competizione o nazione…"
      searchInputAriaLabel="Cerca competizione"
      emptyMessage="Nessuna competizione corrisponde"
      showBadges
      renderOption={(opt) => (
        <span className="flex w-full min-w-0 items-center justify-between gap-2">
          <span className="truncate">{opt.name}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {resultsById.get(opt.id) ?? ''}
          </span>
        </span>
      )}
    />
  )
}

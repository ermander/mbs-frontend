'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarClock, ChevronDown } from 'lucide-react'

import { dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL } from '@/components/profit-tracker/tracker-ds'
import { OmSportIcon } from '@/components/strumenti/scanner-v2/om-ds'
import { bestOddsHref, nationKey, nationLabel, sortedNations } from '@/lib/best-odds'
import { sportDisplay } from '@/lib/bookmakers'
import { cn } from '@/lib/utils'
import type { BestOddsSport } from '@/types/best-odds'
import { ChipCount, NationFlag, chipClass } from './best-odds-parts'

/** The sports of the catalog, the one with the most events first: the first step of the ladder. */
export function BestOddsSportChips({
  sports,
  current,
  onPick,
  className,
}: {
  sports: readonly BestOddsSport[]
  current: string | null
  /** A sport was picked: the search, if any, is over. */
  onPick: () => void
  className?: string
}) {
  return (
    <nav aria-label="Sport" className={cn('flex flex-wrap gap-2', className)}>
      {sports.map((sport) => {
        const active = sport.name === current
        return (
          <Link
            key={sport.name}
            href={bestOddsHref({ sport: sport.name })}
            onClick={onPick}
            aria-current={active ? 'true' : undefined}
            className={chipClass(active)}
          >
            <OmSportIcon sport={sport.name} size={16} />
            {sportDisplay(sport.name).label}
            <ChipCount active={active}>{sport.events}</ChipCount>
          </Link>
        )
      })}
    </nav>
  )
}

const ROW =
  'flex w-full items-center gap-2.5 rounded-ds-sm px-3 py-2 text-left text-sm leading-5 text-ds-ink transition-colors hover:bg-ds-surface-sunken'
const ROW_ACTIVE = 'bg-ds-brand-soft font-semibold text-ds-brand hover:bg-ds-brand-soft'

/**
 * The catalog of one sport: «Prossimi eventi» (every event of the sport by kickoff), then the
 * nations, each opening on its competitions. The nation of the competition on screen is always
 * open; the others open and close with a click. Every entry is a link, so it opens in a new tab
 * too and the address says where one is.
 */
export function BestOddsCatalogPanel({
  sport,
  competitionId,
  searching,
  onPick,
  className,
}: {
  sport: BestOddsSport
  /** The competition whose events are on screen; null = the next events of the sport. */
  competitionId: string | null
  /** The list shows the results of a search: no entry here is the current one. */
  searching: boolean
  /** An entry was picked: the search, if any, is over. */
  onPick: () => void
  className?: string
}) {
  const nations = React.useMemo(() => sortedNations(sport.nations), [sport.nations])
  const currentNation = nations.find((n) => n.competitions.some((c) => c.id === competitionId))
  const currentKey = currentNation ? nationKey(currentNation) : null
  // What the user opened or closed by hand; the first nation starts open, to show what is inside.
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({})
  const firstKey = nations[0] ? nationKey(nations[0]) : null
  const isOpen = (key: string) => toggled[key] ?? (key === currentKey || key === firstKey)
  const upcomingActive = !searching && !competitionId

  return (
    <nav aria-label="Palinsesto" className={cn(DS_PANEL, 'flex min-h-0 flex-col', className)}>
      <h2 className="ds-label m-0 border-b border-ds-line px-4 py-3 text-ds-ink-muted uppercase">
        Palinsesto · {sportDisplay(sport.name).label}
      </h2>
      <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto p-2">
        <Link
          href={bestOddsHref({ sport: sport.name, upcoming: true })}
          onClick={onPick}
          aria-current={upcomingActive ? 'page' : undefined}
          className={cn(ROW, upcomingActive && ROW_ACTIVE, dsFocusRing)}
        >
          <CalendarClock className="h-4 w-4 flex-none" aria-hidden />
          <span className="min-w-0 flex-1 truncate">Prossimi eventi</span>
          <span className="ds-caption flex-none tabular-nums opacity-80">{sport.events}</span>
        </Link>
        {nations.map((nation) => {
          const key = nationKey(nation)
          const open = isOpen(key)
          const label = nationLabel(nation.name, nation.code)
          const listId = `bo-nation-${key.replace(/[^a-zA-Z0-9]/g, '-')}`
          return (
            <div key={key}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setToggled((prev) => ({ ...prev, [key]: !open }))}
                className={cn(ROW, 'cursor-pointer font-medium', dsFocusRing)}
              >
                <NationFlag code={nation.code} name={nation.name} label={label} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="ds-caption flex-none text-ds-ink-muted tabular-nums">
                  {nation.events}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'h-4 w-4 flex-none text-ds-ink-muted transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </button>
              <ul
                id={listId}
                hidden={!open}
                className={cn(
                  'm-0 list-none flex-col gap-0.5 p-0 pb-1 pl-[26px]',
                  open ? 'flex' : 'hidden',
                )}
              >
                {nation.competitions.map((competition) => {
                  const active = !searching && competition.id === competitionId
                  return (
                    <li key={competition.id}>
                      <Link
                        href={bestOddsHref({ sport: sport.name, competitionId: competition.id })}
                        onClick={onPick}
                        aria-current={active ? 'page' : undefined}
                        className={cn(ROW, 'py-1.5', active && ROW_ACTIVE, dsFocusRing)}
                      >
                        <span className="min-w-0 flex-1 truncate">{competition.name}</span>
                        <span className="ds-caption flex-none tabular-nums opacity-80">
                          {competition.events}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

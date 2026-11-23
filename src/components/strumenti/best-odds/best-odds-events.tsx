'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'

import { dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL, DsAlert, countLabel } from '@/components/profit-tracker/tracker-ds'
import { OmEmptyState, OmPagination, OmSportIcon } from '@/components/strumenti/scanner-v2/om-ds'
import { BEST_ODDS_PAGE_SIZE, eventTitle, groupEventsByDay, nationLabel } from '@/lib/best-odds'
import { formatKickoffTime } from '@/lib/matcher/format'
import { cn } from '@/lib/utils'
import type { BestOddsEventSummary } from '@/types/best-odds'
import { Bone, NationFlag } from './best-odds-parts'

const SKELETON_ROWS = 8

/** The way back of a panel: to the catalog from a list, to the list from an event. */
export function BackLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'ds-body-sm inline-flex w-fit items-center gap-1.5 rounded-ds-sm font-semibold text-ds-brand hover:text-ds-brand-hover',
        dsFocusRing,
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 flex-none" aria-hidden />
      {children}
    </Link>
  )
}

/**
 * The events of a competition, of a sport or of a search: under the day they are played, each
 * with its kickoff, how many sites price it and the way to its prices. Every row is a link.
 */
export function BestOddsEventsList({
  title,
  caption,
  back,
  events,
  total,
  page,
  loading,
  failed,
  now,
  showCompetition,
  eventHref,
  onPageChange,
  emptyTitle,
  emptyText,
}: {
  title: React.ReactNode
  /** Under the title: the nation of the competition, what the search looked in. */
  caption?: React.ReactNode
  /** Phone only: back to the catalog. */
  back?: { href: string; label: string; onClick?: () => void }
  events: readonly BestOddsEventSummary[]
  total: number
  /** From zero. */
  page: number
  loading: boolean
  failed: boolean
  now: number
  /** The list spans several competitions: each row says which one. */
  showCompetition: boolean
  eventHref: (event: BestOddsEventSummary) => string
  onPageChange: (page: number) => void
  emptyTitle: string
  emptyText: string
}) {
  const days = React.useMemo(() => groupEventsByDay(events, now), [events, now])

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {back && (
        <BackLink href={back.href} onClick={back.onClick} className="lg:hidden">
          {back.label}
        </BackLink>
      )}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="ds-heading m-0 flex min-w-0 items-center gap-2">{title}</h2>
          {caption && <p className="ds-body-sm m-0 text-ds-ink-muted">{caption}</p>}
        </div>
        {!loading && !failed && total > 0 && (
          <span className="ds-body-sm text-ds-ink-muted tabular-nums">
            {countLabel(total, 'evento', 'eventi')}
          </span>
        )}
      </header>

      {failed ? (
        <DsAlert>
          Non riesco a leggere gli eventi in questo momento. Riprova con «Aggiorna».
        </DsAlert>
      ) : loading ? (
        <div aria-busy="true" className={cn(DS_PANEL, 'overflow-hidden')}>
          <div className="h-8 border-b border-ds-line bg-ds-surface-sunken" />
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-ds-line px-4 py-4">
              <Bone className="h-4 w-10" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 w-12" />
            </div>
          ))}
          <p className="ds-body-sm m-0 px-4 py-3 text-ds-ink-muted">Caricamento degli eventi…</p>
        </div>
      ) : events.length === 0 ? (
        <OmEmptyState title={emptyTitle} description={emptyText} />
      ) : (
        <>
          <div className={cn(DS_PANEL, 'overflow-hidden')}>
            {days.map((day) => (
              <section key={day.key} aria-label={day.label}>
                <h3 className="ds-label m-0 border-b border-ds-line bg-ds-surface-sunken px-4 py-2 text-ds-ink-muted uppercase">
                  {day.label}
                </h3>
                <ul className="m-0 list-none p-0">
                  {day.events.map((event) => (
                    <li key={event.id} className="border-b border-ds-line last:border-b-0">
                      <Link
                        href={eventHref(event)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ds-surface-sunken sm:gap-4',
                          dsFocusRing,
                        )}
                      >
                        <span className="ds-num-sm w-11 flex-none text-ds-ink-muted">
                          {formatKickoffTime(event.startTime)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-semibold text-ds-ink">
                            {eventTitle(event)}
                          </span>
                          {showCompetition && (
                            <span className="ds-caption mt-0.5 flex min-w-0 items-center gap-1.5 text-ds-ink-muted">
                              <span className="inline-flex flex-none text-ds-ink">
                                <OmSportIcon sport={event.sportName} size={14} />
                              </span>
                              <NationFlag
                                code={event.nationCode}
                                name={event.nationName}
                                competitionName={event.competitionName}
                                label={nationLabel(event.nationName, event.nationCode)}
                              />
                              <span className="truncate">{event.competitionName}</span>
                            </span>
                          )}
                        </span>
                        <span className="ds-caption flex-none text-ds-ink-muted tabular-nums">
                          {countLabel(event.bookmakers, 'sito', 'siti')}
                        </span>
                        <ChevronRight className="h-4 w-4 flex-none text-ds-ink-faint" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {total > BEST_ODDS_PAGE_SIZE && (
            <OmPagination
              page={page}
              pageSize={BEST_ODDS_PAGE_SIZE}
              total={total}
              onChange={onPageChange}
              unit="eventi"
              label="Pagine degli eventi"
            />
          )}
        </>
      )}
    </section>
  )
}

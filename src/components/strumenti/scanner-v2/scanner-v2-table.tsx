'use client'

import React from 'react'
import { Calculator } from 'lucide-react'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsMoney } from '@/components/landing/ds-data'
import { BookmakerLink } from './leg-chip'
import { OmBetLeg, OmBookLogo, OmEmptyState, OmPagination, OmRating, OmSportIcon } from './om-ds'
import { legIsExchange, shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { resolveCompetitionFlag } from '@/lib/country-flags'
import {
  ageLabel,
  ageSeconds,
  ageTone,
  formatClock,
  formatKickoffTime,
  isLayLeg,
  marketLabel,
  matcherRowKey,
  outcomeName,
} from '@/lib/matcher/format'
import { legDisplayOdds, quickProfit, type SharedAmounts } from '@/lib/matcher/quick-profit'
import type { MatcherLeg, MatcherMeta, MatcherResult } from '@/types/matcher'
import { cn } from '@/lib/utils'

/** Selection of the Multipla (§14.99): shown as a checkbox column while the panel is open. */
export interface MultiplaSelection {
  isSelected: (row: MatcherResult) => boolean
  eligibility: (row: MatcherResult) => { ok: boolean; reason: string | null }
  onToggle: (row: MatcherResult) => void
}

interface ScannerV2TableProps {
  results: MatcherResult[]
  /** Present while the Multipla panel is open. */
  multipla?: MultiplaSelection
  meta: MatcherMeta | null
  now: number
  shared: SharedAmounts
  /** Exchange commission in percent (4.5). */
  commissionPercent: number
  loading: boolean
  /** A short green flash after «Aggiorna» brought new prices. */
  flash: boolean
  /** The row whose calculator is open: its button is the primary one. */
  activeKey: string | null
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onOpenCalculator: (row: MatcherResult) => void
  onResetFilters: () => void
}

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' })

/** «25/09 · 20:45», as in the design. */
function kickoffLabel(iso: string): string {
  return `${dateFormat.format(new Date(iso))} · ${formatKickoffTime(iso)}`
}

/** Oldest price of the row, the one that decides whether it is still worth a look. */
function rowAge(row: MatcherResult, now: number): number | null {
  const ages = row.legs
    .filter((l) => l.lastSeenAt)
    .map((l) => ageSeconds(l.lastSeenAt as string, now))
  return ages.length ? Math.max(...ages) : null
}

const ageToneClass = { fresh: 'text-ds-ink-muted', aging: 'text-ds-warning', old: 'text-ds-loss' }

/**
 * «Aggiornata»: the age of the oldest price, in warning when it is aging and in loss when it is
 * old (thresholds of `ageTone`, scaled on events re-read slowly); the tooltip lists every leg.
 */
function AgeCell({ row, now }: { row: MatcherResult; now: number }) {
  const age = rowAge(row, now)
  if (age == null) {
    return (
      <span
        className="ds-body-sm text-ds-ink-muted"
        title="Ultimo aggiornamento non disponibile per questa combinazione"
      >
        n.d.
      </span>
    )
  }
  const oldest = row.legs
    .filter((l) => l.lastSeenAt)
    .map((l) => l.lastSeenAt as string)
    .sort()[0]
  const perLeg = row.legs
    .filter((l) => l.lastSeenAt)
    .map(
      (l) =>
        `${shortBookmakerName(l.bookmakerName)} ${ageLabel(ageSeconds(l.lastSeenAt as string, now))} fa`,
    )
    .join(' · ')
  return (
    <span
      className={cn(
        'ds-body-sm whitespace-nowrap tabular-nums',
        ageToneClass[ageTone(age, row.staleAfterSeconds)],
      )}
      title={`Ultimo aggiornamento della combinazione: ${ageLabel(age)} fa (alle ${formatClock(oldest)}), cioè la quota vista meno di recente fra quelle delle gambe. ${perLeg}.`}
    >
      {ageLabel(age)}
    </span>
  )
}

function NationFlag({ row }: { row: MatcherResult }) {
  const flag = resolveCompetitionFlag(row.nationCode, row.nationName, row.competitionName)
  if (!flag) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flag.url}
      alt={flag.label}
      title={flag.label || undefined}
      width={16}
      height={12}
      className="inline-block h-3 w-4 flex-none rounded-[2px] border border-ds-line object-cover"
    />
  )
}

/** One leg as the design's BetLeg, with the logo linking to the event page when known. */
function Leg({
  row,
  leg,
  index,
  meta,
  commissionPercent,
}: {
  row: MatcherResult
  leg: MatcherLeg
  index: number
  meta: MatcherMeta | null
  commissionPercent: number
}) {
  const lay = isLayLeg(leg) || (row.matchType === 'back_lay' && index > 0)
  const exchangeDutch = row.matchType !== 'back_lay' && legIsExchange(leg, meta)
  const displayOdds = legDisplayOdds(leg, row, meta, commissionPercent)
  return (
    <OmBetLeg
      logo={
        <BookmakerLink leg={leg}>
          <OmBookLogo slug={leg.bookmakerSlug} name={leg.bookmakerName} size="sm" />
        </BookmakerLink>
      }
      outcome={outcomeName(leg)}
      odds={displayOdds}
      lay={lay}
      oddsTitle={
        exchangeDutch
          ? `Quota lorda ${displayOdds.toFixed(2)} · netta ${leg.odds.toFixed(3)} con commissione ${commissionPercent.toLocaleString('it-IT')}%`
          : undefined
      }
    />
  )
}

function eventName(row: MatcherResult): string {
  return `${row.homeName ?? '?'} – ${row.awayName ?? '?'}`
}

/** Quick result of the shared stake, on the phone cards only (the calculator has the full one). */
function QuickProfit({
  row,
  shared,
  commissionPercent,
  meta,
}: {
  row: MatcherResult
  shared: SharedAmounts
  commissionPercent: number
  meta: MatcherMeta | null
}) {
  if (shared.puntata == null || shared.puntata <= 0) return null
  const q = quickProfit(row, shared, commissionPercent, meta)
  if (q.profit == null) return null
  return <DsMoney value={q.profit} size="sm" />
}

function MultiplaCheckbox({ row, multipla }: { row: MatcherResult; multipla: MultiplaSelection }) {
  const selected = multipla.isSelected(row)
  const { ok, reason } = multipla.eligibility(row)
  return (
    <input
      type="checkbox"
      checked={selected}
      disabled={!ok && !selected}
      onChange={() => multipla.onToggle(row)}
      onClick={(e) => e.stopPropagation()}
      title={reason ?? (selected ? 'Togli dalla multipla' : 'Aggiungi alla multipla')}
      aria-label={`${selected ? 'Togli dalla multipla' : 'Aggiungi alla multipla'}: ${eventName(row)}`}
      className="m-0 h-4 w-4 accent-[var(--ds-brand)] disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}

function CalcButton({
  row,
  active,
  onOpen,
}: {
  row: MatcherResult
  active: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`Calcola ${eventName(row)}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(dsButtonClass(active ? 'primary' : 'secondary', 'sm'), 'w-8 px-0')}
    >
      <Calculator className="h-4 w-4" aria-hidden />
    </button>
  )
}

const SKELETON_ROWS = 8

/**
 * The results of the Oddsmatcher as the design's Table (§14.272): Data, Evento (with market and
 * competition), Puntata, Bancata · copertura, Rating, Aggiornata and the calculator. A click on the
 * row opens the calculator (or ticks it while the Multipla is open). On the phone the rows become
 * cards. Skeleton on the first load, EmptyState when the filters leave nothing.
 */
export function ScannerV2Table({
  results,
  meta,
  now,
  shared,
  commissionPercent,
  loading,
  flash,
  activeKey,
  page,
  total,
  pageSize,
  onPageChange,
  onOpenCalculator,
  onResetFilters,
  multipla,
}: ScannerV2TableProps) {
  const clickRow = (row: MatcherResult) => {
    if (multipla) {
      if (multipla.isSelected(row) || multipla.eligibility(row).ok) multipla.onToggle(row)
      return
    }
    onOpenCalculator(row)
  }

  if (loading && results.length === 0) {
    return (
      <div
        aria-busy="true"
        className="overflow-hidden rounded-ds-md border border-ds-line bg-ds-surface-raised shadow-ds-sm"
      >
        <div className="h-10 border-b border-ds-line bg-ds-surface-sunken" />
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_90px] gap-6 border-b border-ds-line px-4 py-3.5"
          >
            {Array.from({ length: 5 }, (_, k) => (
              <div key={k} className="h-4 rounded-ds-xs bg-ds-surface-sunken" />
            ))}
          </div>
        ))}
        <p className="ds-body-sm m-0 px-4 py-3 text-ds-ink-muted">Caricamento delle quote…</p>
      </div>
    )
  }

  if (results.length === 0) {
    return <OmEmptyStateWithReset onReset={onResetFilters} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'rounded-ds-md transition-colors duration-150',
          flash ? 'bg-ds-profit-soft' : 'bg-transparent',
        )}
      >
        {/* Telefono: schede */}
        <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
          {results.map((row) => {
            const key = matcherRowKey(row)
            return (
              <li
                key={key}
                onClick={() => clickRow(row)}
                className={cn(
                  'flex cursor-pointer flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised p-4 shadow-ds-sm',
                  multipla?.isSelected(row) && 'border-ds-brand bg-ds-brand-soft',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ds-body-sm block truncate font-semibold text-ds-ink">
                      {eventName(row)}
                    </div>
                    <div className="ds-caption mt-0.5 flex min-w-0 items-center gap-1.5 text-ds-ink-muted">
                      <span className="inline-flex text-ds-ink">
                        <OmSportIcon sport={row.sportName} size={14} />
                      </span>
                      <span className="truncate">
                        {marketLabel(row.marketTypeKey, row.line, row)} · {row.competitionName}
                      </span>
                    </div>
                  </div>
                  <OmRating value={row.rating} />
                </div>
                <div className="flex flex-col gap-1.5">
                  {row.legs.map((leg, i) => (
                    <Leg
                      key={`${leg.bookmakerSlug}-${leg.outcomeKey}-${i}`}
                      row={row}
                      leg={leg}
                      index={i}
                      meta={meta}
                      commissionPercent={commissionPercent}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="ds-body-sm flex min-w-0 flex-wrap items-center gap-x-1.5 tabular-nums text-ds-ink-muted">
                    {kickoffLabel(row.startTime)} · <AgeCell row={row} now={now} />
                  </span>
                  <div className="flex items-center gap-3">
                    <QuickProfit
                      row={row}
                      shared={shared}
                      commissionPercent={commissionPercent}
                      meta={meta}
                    />
                    {multipla ? (
                      <MultiplaCheckbox row={row} multipla={multipla} />
                    ) : (
                      <CalcButton
                        row={row}
                        active={activeKey === key}
                        onOpen={() => onOpenCalculator(row)}
                      />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Tabella */}
        <div className="hidden overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised md:block">
          <table className="w-full border-collapse">
            <caption className="sr-only">Combinazioni puntata/bancata e dutch</caption>
            <thead>
              <tr>
                {multipla && (
                  <th scope="col" className="w-10 bg-ds-surface-sunken p-3 pl-4">
                    <span className="sr-only">Multipla</span>
                  </th>
                )}
                {['Data', 'Evento', 'Puntata', 'Bancata · copertura'].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="ds-label whitespace-nowrap bg-ds-surface-sunken p-3 text-left uppercase text-ds-ink-muted first:pl-4"
                  >
                    {label}
                  </th>
                ))}
                {['Rating', 'Aggiornata'].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="ds-label whitespace-nowrap bg-ds-surface-sunken p-3 text-right uppercase text-ds-ink-muted"
                  >
                    {label}
                  </th>
                ))}
                <th scope="col" className="bg-ds-surface-sunken p-3 pr-4">
                  <span className="sr-only">Calcolatore</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const key = matcherRowKey(row)
                const selected = multipla?.isSelected(row) || activeKey === key
                const sport = sportDisplay(row.sportName)
                return (
                  <tr
                    key={key}
                    onClick={() => clickRow(row)}
                    className={cn(
                      'cursor-pointer',
                      selected ? 'bg-ds-brand-soft' : 'hover:bg-ds-surface-sunken',
                    )}
                  >
                    {multipla && (
                      <td className="border-t border-ds-line p-3 pl-4 align-middle">
                        <MultiplaCheckbox row={row} multipla={multipla} />
                      </td>
                    )}
                    <td className="ds-body-sm whitespace-nowrap border-t border-ds-line p-3 align-middle tabular-nums text-ds-ink-muted first:pl-4">
                      {kickoffLabel(row.startTime)}
                    </td>
                    <td className="min-w-[200px] border-t border-ds-line p-3 align-middle">
                      <span
                        className="block max-w-[260px] truncate font-semibold text-ds-ink"
                        title={eventName(row)}
                      >
                        {eventName(row)}
                      </span>
                      <span className="ds-caption mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-ds-ink-muted">
                        <span className="inline-flex text-ds-ink" title={sport.label}>
                          <OmSportIcon sport={row.sportName} size={14} />
                        </span>
                        {marketLabel(row.marketTypeKey, row.line, row)} ·
                        <NationFlag row={row} />
                        <span className="max-w-[220px] truncate" title={row.competitionName}>
                          {row.competitionName}
                        </span>
                      </span>
                    </td>
                    <td className="border-t border-ds-line p-3 align-middle">
                      <Leg
                        row={row}
                        leg={row.legs[0]}
                        index={0}
                        meta={meta}
                        commissionPercent={commissionPercent}
                      />
                    </td>
                    <td className="border-t border-ds-line p-3 align-middle">
                      <span className="inline-flex flex-col items-start gap-1">
                        {row.legs.slice(1).map((leg, i) => (
                          <Leg
                            key={`${leg.bookmakerSlug}-${leg.outcomeKey}-${i}`}
                            row={row}
                            leg={leg}
                            index={i + 1}
                            meta={meta}
                            commissionPercent={commissionPercent}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-t border-ds-line p-3 text-right align-middle">
                      <OmRating value={row.rating} />
                    </td>
                    <td className="border-t border-ds-line p-3 text-right align-middle">
                      <AgeCell row={row} now={now} />
                    </td>
                    <td className="border-t border-ds-line p-3 pr-4 text-right align-middle">
                      <CalcButton
                        row={row}
                        active={activeKey === key}
                        onOpen={() => onOpenCalculator(row)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <OmPagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} />
    </div>
  )
}

function OmEmptyStateWithReset({ onReset }: { onReset: () => void }) {
  return (
    <OmEmptyState
      title="Nessuna partita con questi filtri"
      description="Nessuna combinazione con questi filtri in questo momento. Prova ad abbassare il rating minimo o ad azzerare i filtri."
      action={
        <button type="button" onClick={onReset} className={dsButtonClass('primary', 'md')}>
          Azzera i filtri
        </button>
      }
    />
  )
}

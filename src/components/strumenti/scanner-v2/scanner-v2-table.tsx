'use client'

import React from 'react'
import { Calculator, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { BookmakerBadge } from './bookmaker-badge'
import { BookmakerLink, LegChip, type LegRole } from './leg-chip'
import { legIsExchange, shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { resolveCompetitionFlag } from '@/lib/country-flags'
import {
  ageClass,
  ageLabel,
  ageSeconds,
  formatClock,
  formatKickoff,
  formatKickoffDate,
  formatKickoffTime,
  isLayLeg,
  marketLabel,
  matchTypeLabel,
  matcherRowKey,
  outcomeName,
} from '@/lib/matcher/format'
import { legDisplayOdds, quickProfit, type SharedAmounts } from '@/lib/matcher/quick-profit'
import type { MatcherMeta, MatcherResult } from '@/types/matcher'
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
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onOpenCalculator: (row: MatcherResult) => void
}

/** Mono on plain background; the green tint marks only a rating from 100% up. */
function ratingBadge(rating: number) {
  const base =
    'inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums'
  if (rating >= 100) return `${base} bg-emerald-500/15 text-emerald-300`
  return `${base} text-foreground`
}

/** Flag of the competition's nation (the European one for UEFA competitions filed under «World»), the nation name when no flag is available. */
function NationFlag({
  code,
  name,
  competition,
}: {
  code: string | null
  name: string | null
  competition: string
}) {
  const flag = resolveCompetitionFlag(code, name, competition)
  if (!flag) return name ? <span>{name}</span> : null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flag.url}
      alt={flag.label}
      title={flag.label || undefined}
      className="inline-block h-3 w-4 shrink-0 rounded-sm object-cover align-[-1px]"
    />
  )
}

/** Neutral for a back price, a light rose for a lay one; the outcome sits in its own «Esito» cell. */
function oddsCellClass(lay: boolean) {
  return cn(
    'inline-flex items-center rounded px-1.5 py-0.5',
    lay ? 'bg-rose-500/15 text-rose-300' : 'bg-muted text-foreground',
  )
}

/**
 * Last update of the row, as text: the age of the oldest price on the
 * first line (coloured like the leg dots: green fresh, amber aging, red
 * old) and the clock time it was seen on the second; the tooltip lists
 * the age of each leg. The clock icon lives only in the table header.
 */
function LastSeenCell({ row, now }: { row: MatcherResult; now: number }) {
  const age = rowAge(row, now)
  if (age == null) {
    return (
      <span
        className="text-xs text-muted-foreground"
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
  const title = `Ultimo aggiornamento della combinazione: ${ageLabel(age)} fa (alle ${formatClock(oldest)}), cioè la quota vista meno di recente fra quelle delle gambe. ${perLeg}.`
  return (
    <span
      className="inline-block whitespace-nowrap text-xs tabular-nums"
      title={title}
      aria-label={`Ultimo aggiornamento ${ageLabel(age)} fa`}
    >
      <span className={cn('block font-medium', ageClass(age, row.staleAfterSeconds))}>
        {ageLabel(age)} fa
      </span>
      <span className="block text-muted-foreground">{formatClock(oldest)}</span>
    </span>
  )
}

/** The type as a quiet tag: the label tells it, no colour code. */
function matchTypeBadge() {
  return 'inline-flex items-center whitespace-nowrap rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground'
}

function formatEuro(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} €`
}

/** Oldest price of the row, the one that decides whether it is still worth a look. */
function rowAge(row: MatcherResult, now: number): number | null {
  const ages = row.legs
    .filter((l) => l.lastSeenAt)
    .map((l) => ageSeconds(l.lastSeenAt as string, now))
  return ages.length ? Math.max(...ages) : null
}

export function RowLegs({
  row,
  meta,
  now,
  commissionPercent,
  className,
}: {
  row: MatcherResult
  meta: MatcherMeta | null
  now: number
  commissionPercent: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {row.legs.map((leg, i) => {
        const role: LegRole = row.matchType === 'back_lay' ? (i === 0 ? 'punta' : 'banca') : 'dutch'
        const exchangeDutch = row.matchType !== 'back_lay' && legIsExchange(leg, meta)
        return (
          <LegChip
            key={`${leg.bookmakerSlug}-${leg.outcomeKey}-${i}`}
            leg={leg}
            role={role}
            displayOdds={legDisplayOdds(leg, row, meta, commissionPercent)}
            netOdds={exchangeDutch ? leg.odds : null}
            commissionPercent={exchangeDutch ? commissionPercent : undefined}
            now={now}
            staleAfterSeconds={row.staleAfterSeconds}
          />
        )
      })}
    </div>
  )
}

function ProfitCell({
  row,
  shared,
  commissionPercent,
  meta,
  className,
}: {
  row: MatcherResult
  shared: SharedAmounts
  commissionPercent: number
  meta: MatcherMeta | null
  className?: string
}) {
  if (shared.puntata == null || shared.puntata <= 0) {
    return (
      <span
        className={cn('text-xs text-muted-foreground', className)}
        title="Inserisci la puntata nella barra"
      >
        —
      </span>
    )
  }
  const q = quickProfit(row, shared, commissionPercent, meta)
  if (q.profit == null) {
    return (
      <span
        className={cn('text-xs text-muted-foreground', className)}
        title="Copertura non calcolabile con questi importi"
      >
        n.d.
      </span>
    )
  }
  const coverLabel = row.matchType === 'back_lay' ? 'Bancata' : 'Copertura'
  const title = `${coverLabel} ${q.covers.map((c) => c.toFixed(2)).join(' · ')} € · puntata sulla gamba ${
    row.matchType === 'back_lay' ? 'Punta' : '1'
  }`
  return (
    <span
      className={cn(
        'font-mono text-[13px] font-medium tabular-nums',
        q.profit >= 0 ? 'text-emerald-400' : 'text-red-400',
        className,
      )}
      title={title}
    >
      {formatEuro(q.profit)}
    </span>
  )
}

export function ScannerV2Table({
  results,
  meta,
  now,
  shared,
  commissionPercent,
  loading,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onOpenCalculator,
  multipla,
}: ScannerV2TableProps) {
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  // «Book 3 / Esito 3 / Quota 3» appear only when a row of the page has a third leg.
  const legColumns = Math.max(2, ...results.map((r) => r.legs.length))

  const empty = (
    <div className="rounded-ow-card border border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
      {loading && results.length === 0 ? 'Caricamento…' : 'Nessuna combinazione con questi filtri.'}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {results.length === 0
          ? empty
          : results.map((row) => {
              const sport = sportDisplay(row.sportName)
              const age = rowAge(row, now)
              return (
                <div
                  key={matcherRowKey(row)}
                  className="rounded-ow-card border border-border bg-card p-3 transition-colors"
                  onClick={() => onOpenCalculator(row)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {sport.icon && <span className="text-sm">{sport.icon}</span>}
                        <span className="truncate text-sm font-medium">
                          {row.homeName} – {row.awayName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.competitionName} · {marketLabel(row.marketTypeKey, row.line, row)} ·{' '}
                        {formatKickoff(row.startTime)}
                      </p>
                    </div>
                    <span className={ratingBadge(row.rating)}>{row.rating.toFixed(2)}%</span>
                  </div>
                  <RowLegs
                    row={row}
                    meta={meta}
                    now={now}
                    commissionPercent={commissionPercent}
                    className="mt-2"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={matchTypeBadge()}>{matchTypeLabel(row.matchType)}</span>
                      {age != null && (
                        <span
                          className={cn(
                            'text-[11px] tabular-nums',
                            ageClass(age, row.staleAfterSeconds),
                          )}
                        >
                          vista {ageLabel(age)} fa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {multipla && <MultiplaCheckbox row={row} multipla={multipla} />}
                      <ProfitCell
                        row={row}
                        shared={shared}
                        commissionPercent={commissionPercent}
                        meta={meta}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Apri calcolatore"
                        onClick={() => onOpenCalculator(row)}
                      >
                        <Calculator className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
      </div>

      {/* Desktop: table. The results scroll inside this box, both ways, so the
          page, the toolbar and the pagination stay put and the horizontal
          scrollbar is always within reach; the header row sticks to the top. */}
      <div className="hidden max-h-[calc(100dvh-17rem-var(--topnav-h))] min-h-[20rem] overflow-auto rounded-ow-card border border-border md:block">
        <table className="w-full min-w-[1100px] text-[13px]">
          <thead className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
            <tr className="bg-muted/50 text-left font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
              {multipla && (
                <th className="w-10 px-2 py-2 text-center font-normal" aria-label="Multipla" />
              )}
              <th className="whitespace-nowrap px-3 py-2 font-normal">Data</th>
              <th className="px-2 py-2 text-center font-normal" aria-label="Sport">
                Sport
              </th>
              <th className="px-3 py-2 font-normal">Evento</th>
              <th className="whitespace-nowrap px-3 py-2 font-normal">Mercato</th>
              {Array.from({ length: legColumns }, (_, i) => (
                <React.Fragment key={i}>
                  <th className="whitespace-nowrap px-3 py-2 font-normal">Book {i + 1}</th>
                  <th className="whitespace-nowrap px-3 py-2 font-normal">Esito {i + 1}</th>
                  <th className="whitespace-nowrap px-3 py-2 font-normal">Quota {i + 1}</th>
                </React.Fragment>
              ))}
              <th className="px-3 py-2 text-right font-normal">Rating</th>
              <th className="px-2 py-2 text-center font-normal" title="Ultimo aggiornamento">
                <Clock className="inline h-3.5 w-3.5" aria-label="Ultimo aggiornamento" />
              </th>
              <th className="px-2 py-2 text-center font-normal" aria-label="Calcolatore" />
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td
                  colSpan={(multipla ? 1 : 0) + 7 + legColumns * 3}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {loading && results.length === 0
                    ? 'Caricamento…'
                    : 'Nessuna combinazione con questi filtri.'}
                </td>
              </tr>
            ) : (
              results.map((row) => {
                const sport = sportDisplay(row.sportName)
                return (
                  <tr
                    key={matcherRowKey(row)}
                    className={cn(
                      'cursor-pointer border-b border-border transition-colors hover:bg-accent/60',
                      multipla?.isSelected(row) && 'bg-accent',
                    )}
                    onClick={() => onOpenCalculator(row)}
                  >
                    {multipla && (
                      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <MultiplaCheckbox row={row} multipla={multipla} />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
                      <div className="text-foreground">{formatKickoffDate(row.startTime)}</div>
                      <div className="text-muted-foreground">
                        h. {formatKickoffTime(row.startTime)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center" title={sport.label}>
                      {sport.icon ? (
                        <span className="text-lg leading-none" aria-hidden>
                          {sport.icon}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{sport.label}</span>
                      )}
                    </td>
                    <td className="min-w-[200px] px-3 py-2">
                      <div className="whitespace-nowrap font-medium">
                        {row.homeName} – {row.awayName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <NationFlag
                          code={row.nationCode}
                          name={row.nationName}
                          competition={row.competitionName}
                        />
                        <span>{row.competitionName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {marketLabel(row.marketTypeKey, row.line, row)}
                    </td>
                    {Array.from({ length: legColumns }, (_, i) => {
                      const leg = row.legs[i]
                      if (!leg) {
                        return (
                          <React.Fragment key={i}>
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2" />
                          </React.Fragment>
                        )
                      }
                      const lay = isLayLeg(leg) || (row.matchType === 'back_lay' && i > 0)
                      const exchangeDutch = row.matchType !== 'back_lay' && legIsExchange(leg, meta)
                      const displayOdds = legDisplayOdds(leg, row, meta, commissionPercent)
                      const priceTitle = exchangeDutch
                        ? `Quota lorda ${displayOdds.toFixed(2)} · netta ${leg.odds.toFixed(3)} con commissione ${commissionPercent.toLocaleString('it-IT')}%`
                        : undefined
                      return (
                        <React.Fragment key={`${leg.bookmakerSlug}-${leg.outcomeKey}-${i}`}>
                          <td className="whitespace-nowrap px-3 py-2">
                            <BookmakerLink leg={leg}>
                              <BookmakerBadge
                                slug={leg.bookmakerSlug}
                                name={leg.bookmakerName}
                                size="md"
                              />
                            </BookmakerLink>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-foreground">
                            {outcomeName(leg)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span className={oddsCellClass(lay)} title={priceTitle}>
                              <span className="font-mono text-[13px] font-medium tabular-nums">
                                {displayOdds.toFixed(2)}
                              </span>
                            </span>
                          </td>
                        </React.Fragment>
                      )
                    })}
                    <td className="px-3 py-2 text-right">
                      <span className={ratingBadge(row.rating)}>{row.rating.toFixed(2)}%</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <LastSeenCell row={row} now={now} />
                    </td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Apri calcolatore"
                        onClick={() => onOpenCalculator(row)}
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-ow-card border border-border bg-surface-1 px-4 py-2">
          <p className="text-[13px] tabular-nums text-muted-foreground">
            {start}–{end} di {total.toLocaleString('it-IT')} combinazioni
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-ow-btn"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page <= 0}
              aria-label="Pagina precedente"
            >
              <ChevronLeft className="h-4 w-4" />
              Indietro
            </Button>
            <span className="text-xs text-muted-foreground">
              Pagina {page + 1} di {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-ow-btn"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Pagina successiva"
            >
              Avanti
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MultiplaCheckbox({ row, multipla }: { row: MatcherResult; multipla: MultiplaSelection }) {
  const selected = multipla.isSelected(row)
  const { ok, reason } = multipla.eligibility(row)
  return (
    <span title={reason ?? (selected ? 'Togli dalla multipla' : 'Aggiungi alla multipla')}>
      <Checkbox
        checked={selected}
        disabled={!ok}
        onChange={() => multipla.onToggle(row)}
        aria-label={selected ? 'Togli dalla multipla' : 'Aggiungi alla multipla'}
      />
    </span>
  )
}

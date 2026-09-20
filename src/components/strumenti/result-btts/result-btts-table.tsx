'use client'

import React from 'react'
import { Calculator, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookmakerBadge } from '@/components/strumenti/scanner-v2/bookmaker-badge'
import { BookmakerLink } from '@/components/strumenti/scanner-v2/leg-chip'
import { sportDisplay } from '@/lib/bookmakers'
import { resolveCompetitionFlag } from '@/lib/country-flags'
import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import {
  ageClass,
  ageLabel,
  formatClock,
  formatKickoff,
  formatKickoffDate,
  formatKickoffTime,
} from '@/lib/matcher/format'
import type { SharedAmounts } from '@/lib/matcher/quick-profit'
import {
  RESULT_BTTS_COMPARED,
  RESULT_BTTS_EXCLUDED,
  RESULT_BTTS_OUTCOME_LABELS,
  resultBttsLegs,
  resultBttsRowAge,
  resultBttsRowKey,
} from '@/lib/result-btts'
import type { ResultBttsRow } from '@/types/result-btts'
import { cn } from '@/lib/utils'

interface ResultBttsTableProps {
  rows: ResultBttsRow[]
  now: number
  shared: SharedAmounts
  loading: boolean
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onOpenCalculator: (row: ResultBttsRow) => void
}

/** Bold on plain background; the green tint marks only a rating from 100% up. */
function ratingBadge(rating: number) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums'
  return rating >= 100 ? `${base} bg-emerald-100 text-emerald-900` : `${base} text-foreground`
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

/**
 * The minimum profit of the five-way dutch with the shared amounts (stake on
 * «1 & GG», covers on the other four): a 0-0 is not among the outcomes, it
 * loses the whole outlay.
 */
function quickMinProfit(row: ResultBttsRow, shared: SharedAmounts): number | null {
  if (shared.puntata == null || shared.puntata <= 0) return null
  const legs = resultBttsLegs(row)
  if (legs.length !== RESULT_BTTS_COMPARED.length) return null
  const result = computeDutch({
    legs: legs.map((leg) => ({ grossOdds: leg.odds, commissionPercent: 0 })),
    puntaIndex: 0,
    puntata: shared.puntata,
    bonus: shared.bonus,
    rimborso: shared.rimborso,
    imbalancePercent: 0,
  })
  return result.guadagnoMinimo
}

function ProfitCell({
  row,
  shared,
  className,
}: {
  row: ResultBttsRow
  shared: SharedAmounts
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
  const profit = quickMinProfit(row, shared)
  if (profit == null) {
    return (
      <span
        className={cn('text-xs text-muted-foreground', className)}
        title="Copertura non calcolabile con questi importi"
      >
        n.d.
      </span>
    )
  }
  return (
    <span
      className={cn(
        'font-mono text-sm font-semibold tabular-nums',
        profit >= 0 ? 'text-emerald-400' : 'text-red-400',
        className,
      )}
      title="Guadagno minimo fra i cinque esiti coperti, puntata su 1 & GG; uno 0-0 perde l'esborso"
    >
      {profit >= 0 ? '+' : ''}
      {profit.toFixed(2)} €
    </span>
  )
}

function LastSeenCell({ row, now }: { row: ResultBttsRow; now: number }) {
  const age = resultBttsRowAge(row, now)
  return (
    <span
      className="inline-block whitespace-nowrap text-xs tabular-nums"
      title={`Quota vista meno di recente fra le cinque: ${ageLabel(age)} fa (alle ${formatClock(row.lastSeenAt)})`}
      aria-label={`Ultimo aggiornamento ${ageLabel(age)} fa`}
    >
      <span className={cn('block font-medium', ageClass(age, row.staleAfterSeconds))}>
        {ageLabel(age)} fa
      </span>
      <span className="block text-muted-foreground">{formatClock(row.lastSeenAt)}</span>
    </span>
  )
}

function PriceCell({ odds, excluded }: { odds: number | undefined; excluded?: boolean }) {
  if (odds == null) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 font-mono text-sm font-bold tabular-nums',
        excluded
          ? 'bg-muted text-muted-foreground line-through decoration-muted-foreground/60'
          : 'bg-sky-100 text-sky-900',
      )}
      title={excluded ? 'X & NG (0-0): escluso dal confronto' : undefined}
    >
      {odds.toFixed(2)}
    </span>
  )
}

export function ResultBttsTable({
  rows,
  now,
  shared,
  loading,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onOpenCalculator,
}: ResultBttsTableProps) {
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  const empty = (
    <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
      {loading && rows.length === 0 ? 'Caricamento…' : 'Nessun confronto con questi filtri.'}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0
          ? empty
          : rows.map((row) => {
              const sport = sportDisplay(row.sportName)
              const age = resultBttsRowAge(row, now)
              return (
                <div
                  key={resultBttsRowKey(row)}
                  className="rounded-xl border border-border bg-card p-3"
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
                        {row.competitionName} · {formatKickoff(row.startTime)}
                      </p>
                    </div>
                    <span className={ratingBadge(row.rating)}>{row.rating.toFixed(2)}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <BookmakerLink leg={row}>
                      <BookmakerBadge slug={row.bookmakerSlug} name={row.bookmakerName} />
                    </BookmakerLink>
                    {RESULT_BTTS_COMPARED.map((key) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1"
                      >
                        <span className="text-xs">{RESULT_BTTS_OUTCOME_LABELS[key]}</span>
                        <span className="font-mono text-sm font-bold tabular-nums text-sky-300">
                          {row.prices[key]?.odds.toFixed(2) ?? '—'}
                        </span>
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-muted-foreground line-through">
                      <span className="text-xs">
                        {RESULT_BTTS_OUTCOME_LABELS[RESULT_BTTS_EXCLUDED]}
                      </span>
                      <span className="font-mono text-sm tabular-nums">
                        {row.prices[RESULT_BTTS_EXCLUDED]?.odds.toFixed(2) ?? '—'}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[11px] tabular-nums',
                        ageClass(age, row.staleAfterSeconds),
                      )}
                    >
                      vista {ageLabel(age)} fa
                    </span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <ProfitCell row={row} shared={shared} />
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

      {/* Desktop: table */}
      <div className="hidden max-h-[calc(100dvh-19rem-var(--topnav-h))] min-h-[20rem] overflow-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
            <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="whitespace-nowrap px-3 py-2 font-medium">Data</th>
              <th className="px-2 py-2 text-center font-medium">Sport</th>
              <th className="px-3 py-2 font-medium">Evento</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Book</th>
              {RESULT_BTTS_COMPARED.map((key) => (
                <th key={key} className="whitespace-nowrap px-2 py-2 text-center font-medium">
                  {RESULT_BTTS_OUTCOME_LABELS[key]}
                </th>
              ))}
              <th
                className="whitespace-nowrap px-2 py-2 text-center font-medium"
                title="Escluso dal confronto"
              >
                {RESULT_BTTS_OUTCOME_LABELS[RESULT_BTTS_EXCLUDED]} (escl.)
              </th>
              <th className="px-3 py-2 text-right font-medium">Rating</th>
              <th
                className="px-3 py-2 text-right font-medium"
                title="Guadagno minimo con la puntata della barra"
              >
                Guadagno
              </th>
              <th className="px-2 py-2 text-center font-medium" title="Ultimo aggiornamento">
                <Clock className="inline h-3.5 w-3.5" aria-label="Ultimo aggiornamento" />
              </th>
              <th className="px-2 py-2 text-center font-medium" aria-label="Calcolatore" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                  {loading && rows.length === 0
                    ? 'Caricamento…'
                    : 'Nessun confronto con questi filtri.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const sport = sportDisplay(row.sportName)
                return (
                  <tr
                    key={resultBttsRowKey(row)}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-accent/60"
                    onClick={() => onOpenCalculator(row)}
                  >
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
                      <BookmakerLink leg={row}>
                        <BookmakerBadge
                          slug={row.bookmakerSlug}
                          name={row.bookmakerName}
                          size="md"
                        />
                      </BookmakerLink>
                    </td>
                    {RESULT_BTTS_COMPARED.map((key) => (
                      <td key={key} className="whitespace-nowrap px-2 py-2 text-center">
                        <PriceCell odds={row.prices[key]?.odds} />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <PriceCell odds={row.prices[RESULT_BTTS_EXCLUDED]?.odds} excluded />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={ratingBadge(row.rating)}>{row.rating.toFixed(2)}%</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ProfitCell row={row} shared={shared} />
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

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-muted/30 px-4 py-2.5">
          <p className="text-sm text-muted-foreground">
            {start}–{end} di {total.toLocaleString('it-IT')} confronti
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
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

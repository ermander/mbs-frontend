'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookmakerBadge } from '@/components/strumenti/scanner-v2/bookmaker-badge'
import { BookmakerLink } from '@/components/strumenti/scanner-v2/leg-chip'
import { sportDisplay } from '@/lib/bookmakers'
import { resolveCompetitionFlag } from '@/lib/country-flags'
import {
  ageClass,
  ageLabel,
  formatClock,
  formatKickoff,
  formatKickoffDate,
  formatKickoffTime,
} from '@/lib/matcher/format'
import {
  formatEuro,
  formatSignedEuro,
  formatSignedPct,
  profitTone,
  refundZeroOtherLines,
  refundZeroRowAge,
  refundZeroRowKey,
} from '@/lib/refund-zero'
import type { RefundZeroLine, RefundZeroRow } from '@/types/refund-zero'
import { cn } from '@/lib/utils'

interface RefundZeroTableProps {
  rows: RefundZeroRow[]
  now: number
  loading: boolean
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

const COLUMNS = 10

/** Green from the first cent of profit, red at a loss. */
export function profitBadge(profit: number) {
  const base = 'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tabular-nums'
  const tone = profitTone(profit)
  if (tone === 'positive') return `${base} bg-emerald-500/15 text-emerald-300`
  if (tone === 'negative') return `${base} bg-destructive/10 text-destructive`
  return `${base} text-foreground`
}

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

function LastSeenCell({ row, now }: { row: RefundZeroRow; now: number }) {
  const age = refundZeroRowAge(row, now)
  return (
    <span
      className="inline-block whitespace-nowrap text-xs tabular-nums"
      title={`Quota vista meno di recente fra le tre: ${ageLabel(age)} fa (alle ${formatClock(row.lastSeenAt)})`}
      aria-label={`Ultimo aggiornamento ${ageLabel(age)} fa`}
    >
      <span className={cn('block font-medium', ageClass(age, row.staleAfterSeconds))}>
        {ageLabel(age)} fa
      </span>
      <span className="block text-muted-foreground">{formatClock(row.lastSeenAt)}</span>
    </span>
  )
}

/** A price chip: a label and the odds, blue for the back, rose for a lay. */
function PriceChip({ label, odds, side }: { label: string; odds: number; side: 'back' | 'lay' }) {
  const tone =
    side === 'back'
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1', tone)}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums">{odds.toFixed(2)}</span>
    </span>
  )
}

/** The three legs of a line with their money: what to type on the two sites. */
function LineDetail({ line, row }: { line: RefundZeroLine; row: RefundZeroRow }) {
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-3">
      <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Punta {line.label} · {row.backBookmaker.name}
        </div>
        <div className="mt-1 font-mono tabular-nums">
          {formatEuro(row.stake)} @ {line.back.odds.toFixed(2)}
        </div>
      </div>
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Banca {line.label} · {row.layBookmaker.name}
        </div>
        <div className="mt-1 font-mono tabular-nums">
          {formatEuro(line.layStake)} @ {line.lay.odds.toFixed(2)}
        </div>
        <div className="text-muted-foreground">responsabilità {formatEuro(line.layLiability)}</div>
      </div>
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Banca 0-0 · {row.layBookmaker.name}
        </div>
        <div className="mt-1 font-mono tabular-nums">
          {formatEuro(line.zeroLayStake)} @ {row.zeroZero.lay.odds.toFixed(2)}
        </div>
        <div className="text-muted-foreground">responsabilità {formatEuro(line.zeroLiability)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground sm:col-span-3">
        <span>
          Se esce {line.label}:{' '}
          <b className="text-foreground">{formatSignedEuro(line.cases.scoreWins)}</b>
        </span>
        <span>
          Altro risultato:{' '}
          <b className="text-foreground">{formatSignedEuro(line.cases.otherResult)}</b>
        </span>
        <span>
          0-0 (rimborso): <b className="text-foreground">{formatSignedEuro(line.cases.zeroZero)}</b>
        </span>
        <span>
          Perdita di qualificazione {formatEuro(line.qualifyingLoss)} · commissione{' '}
          {(row.commission * 100).toLocaleString('it-IT')} %
        </span>
        {row.zeroZero.back && (
          <span>
            0-0 a {row.backBookmaker.name}: {row.zeroZero.back.odds.toFixed(2)} (riferimento)
          </span>
        )}
      </div>
    </div>
  )
}

/** The other scores of the row, each with its profit; the best is in the row itself. */
function OtherLines({ row }: { row: RefundZeroRow }) {
  const others = refundZeroOtherLines(row)
  if (others.length === 0) return null
  return (
    <div className="mt-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Altri risultati
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {others.map((line) => (
          <span
            key={line.outcomeKey}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
            title={`Punta ${line.back.odds.toFixed(2)} · banca ${line.lay.odds.toFixed(2)}`}
          >
            <span className="font-medium">{line.label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {line.back.odds.toFixed(2)}/{line.lay.odds.toFixed(2)}
            </span>
            <span
              className={cn(
                'font-mono tabular-nums',
                profitTone(line.profit) === 'positive'
                  ? 'text-emerald-300'
                  : profitTone(line.profit) === 'negative'
                    ? 'text-destructive'
                    : '',
              )}
            >
              {formatSignedEuro(line.profit)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function RefundZeroTable({
  rows,
  now,
  loading,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: RefundZeroTableProps) {
  const [open, setOpen] = useState<string | null>(null)
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  const toggle = (key: string) => setOpen((prev) => (prev === key ? null : key))
  const empty = (
    <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
      {loading && rows.length === 0 ? 'Caricamento…' : 'Nessuna partita con questi filtri.'}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0
          ? empty
          : rows.map((row) => {
              const key = refundZeroRowKey(row)
              const age = refundZeroRowAge(row, now)
              const sport = sportDisplay(row.sportName)
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-3">
                  <button type="button" className="w-full text-left" onClick={() => toggle(key)}>
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
                      <span className={profitBadge(row.best.profit)}>
                        {formatSignedEuro(row.best.profit)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <BookmakerBadge slug={row.backBookmaker.slug} name={row.backBookmaker.name} />
                      <PriceChip
                        label={`Punta ${row.best.label}`}
                        odds={row.best.back.odds}
                        side="back"
                      />
                      <PriceChip
                        label={`Banca ${row.best.label}`}
                        odds={row.best.lay.odds}
                        side="lay"
                      />
                      <PriceChip label="Banca 0-0" odds={row.zeroZero.lay.odds} side="lay" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className={cn('tabular-nums', ageClass(age, row.staleAfterSeconds))}>
                        vista {ageLabel(age)} fa
                      </span>
                      <span className="text-muted-foreground">
                        {formatSignedPct(row.best.profitPct)} su {formatEuro(row.stake)}
                      </span>
                    </div>
                  </button>
                  {open === key && (
                    <div className="mt-3 border-t border-border pt-3">
                      <LineDetail line={row.best} row={row} />
                      <OtherLines row={row} />
                    </div>
                  )}
                </div>
              )
            })}
      </div>

      {/* Desktop: table */}
      <div className="hidden max-h-[calc(100dvh-16rem-var(--topnav-h))] min-h-[20rem] overflow-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
            <tr className="bg-muted/50 text-left font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
              <th className="whitespace-nowrap px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Evento</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Punta</th>
              <th
                className="whitespace-nowrap px-2 py-2 font-medium"
                title="Il risultato puntato e la sua quota al book"
              >
                Risultato
              </th>
              <th
                className="whitespace-nowrap px-2 py-2 font-medium"
                title="La bancata dello stesso risultato sull'exchange"
              >
                Banca
              </th>
              <th
                className="whitespace-nowrap px-2 py-2 font-medium"
                title="La bancata dello 0-0 sull'exchange: il caso rimborsato"
              >
                Banca 0-0
              </th>
              <th
                className="whitespace-nowrap px-2 py-2 text-right font-medium"
                title="Bancate da piazzare per la puntata impostata"
              >
                Bancate €
              </th>
              <th className="px-3 py-2 text-right font-medium">Profitto</th>
              <th className="px-2 py-2 text-center font-medium" title="Ultimo aggiornamento">
                <Clock className="inline h-3.5 w-3.5" aria-label="Ultimo aggiornamento" />
              </th>
              <th className="px-2 py-2 text-center font-medium" aria-label="Dettaglio" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS} className="px-3 py-8 text-center text-muted-foreground">
                  {loading && rows.length === 0
                    ? 'Caricamento…'
                    : 'Nessuna partita con questi filtri.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = refundZeroRowKey(row)
                const isOpen = open === key
                return (
                  <React.Fragment key={key}>
                    <tr
                      className="cursor-pointer border-b border-border transition-colors hover:bg-accent/60"
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
                        <div className="text-foreground">{formatKickoffDate(row.startTime)}</div>
                        <div className="text-muted-foreground">
                          h. {formatKickoffTime(row.startTime)}
                        </div>
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
                      <td
                        className="whitespace-nowrap px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BookmakerLink
                          leg={{
                            bookmakerName: row.backBookmaker.name,
                            eventUrl: row.backBookmaker.eventUrl,
                          }}
                        >
                          <BookmakerBadge
                            slug={row.backBookmaker.slug}
                            name={row.backBookmaker.name}
                            size="md"
                          />
                        </BookmakerLink>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <PriceChip label={row.best.label} odds={row.best.back.odds} side="back" />
                      </td>
                      <td
                        className="whitespace-nowrap px-2 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BookmakerLink
                          leg={{
                            bookmakerName: row.layBookmaker.name,
                            eventUrl: row.layBookmaker.eventUrl,
                          }}
                        >
                          <PriceChip label={row.best.label} odds={row.best.lay.odds} side="lay" />
                        </BookmakerLink>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <PriceChip label="0-0" odds={row.zeroZero.lay.odds} side="lay" />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs tabular-nums">
                        <div title="Bancata sul risultato">{formatEuro(row.best.layStake)}</div>
                        <div className="text-muted-foreground" title="Bancata sullo 0-0">
                          {formatEuro(row.best.zeroLayStake)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <span className={profitBadge(row.best.profit)}>
                          {formatSignedEuro(row.best.profit)}
                        </span>
                        <div className="text-[11px] tabular-nums text-muted-foreground">
                          {formatSignedPct(row.best.profitPct)}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <LastSeenCell row={row} now={now} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={isOpen ? 'Chiudi il dettaglio' : 'Apri il dettaglio'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(key)
                          }}
                        >
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={COLUMNS} className="px-4 py-3">
                          <LineDetail line={row.best} row={row} />
                          <OtherLines row={row} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-muted/30 px-4 py-2.5">
          <p className="text-sm text-muted-foreground">
            {start}–{end} di {total.toLocaleString('it-IT')} partite
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

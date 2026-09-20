'use client'

import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { sportDisplay } from '@/lib/bookmakers'
import type { BetEventInfo } from '@/lib/calculators/bet-payloads'
import { formatKickoffLong, marketLabel, matchTypeLabel, matcherRowKey } from '@/lib/matcher/format'
import type { MatcherMeta, MatcherResult } from '@/types/matcher'
import { DutchCalculatorView } from './dutch-calculator-view'
import { PuntaBancaCalculatorView, type CalculatorDefaults } from './punta-banca-calculator-view'

interface MatcherCalculatorModalProps {
  row: MatcherResult | null
  meta: MatcherMeta | null
  defaults: CalculatorDefaults
  /** Exchange commission in percent (4.5). */
  commissionPercent: number
  onClose: () => void
}

/** The event of a row as the Profit Tracker payloads describe it. */
export function betEventInfo(row: MatcherResult): BetEventInfo {
  return {
    eventoDataIso: new Date(row.startTime).toISOString(),
    eventoNome: `${row.homeName ?? '?'} vs ${row.awayName ?? '?'}`,
    competizione: row.competitionName,
    sport: sportDisplay(row.sportName).ptSport,
    mercato: marketLabel(row.marketTypeKey, row.line, row),
  }
}

/**
 * One modal for every row of the scanner v2: Punta-Banca on a back/lay row,
 * dutching on a two- or three-way row. The view is keyed by the row, so it
 * mounts fresh with the row's prices and the shared amounts.
 */
export function MatcherCalculatorModal({
  row,
  meta,
  defaults,
  commissionPercent,
  onClose,
}: MatcherCalculatorModalProps) {
  const event = useMemo(() => (row ? betEventInfo(row) : null), [row])
  const open = row != null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[100dvh] max-w-3xl overflow-y-auto overflow-x-hidden rounded-ow-card p-0 sm:max-h-[90vh]"
        showClose={true}
      >
        <DialogTitle asChild>
          <VisuallyHidden>
            {row ? `Calcolatore ${matchTypeLabel(row.matchType)}` : 'Calcolatore'}
          </VisuallyHidden>
        </DialogTitle>
        {row && event && (
          <div className="flex min-w-0 flex-col overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] sm:gap-x-3">
                <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                  {row.competitionName}
                </span>
                <span className="font-medium text-foreground">
                  {row.homeName} <span className="text-muted-foreground">vs</span> {row.awayName}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatKickoffLong(row.startTime)}
                </span>
                <span className="text-muted-foreground">
                  {event.mercato} · {matchTypeLabel(row.matchType)} · rating {row.rating.toFixed(2)}
                  %
                </span>
              </div>
            </div>
            {row.matchType === 'back_lay' ? (
              <PuntaBancaCalculatorView
                key={matcherRowKey(row)}
                row={row}
                event={event}
                defaults={defaults}
                commissionPercent={commissionPercent}
                onClose={onClose}
              />
            ) : (
              <DutchCalculatorView
                key={matcherRowKey(row)}
                row={row}
                meta={meta}
                event={event}
                defaults={defaults}
                commissionPercent={commissionPercent}
                onClose={onClose}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

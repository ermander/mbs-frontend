'use client'

import { useMemo } from 'react'
import { CalculatorPanel } from '@/components/calculators/calculator-panel'
import { CALCULATOR_TOOLS, type CalculatorSlug } from '@/lib/calculators/catalog'
import { sportDisplay } from '@/lib/bookmakers'
import type { BetEventInfo } from '@/lib/calculators/bet-payloads'
import { formatKickoffTime, marketLabel, matcherRowKey } from '@/lib/matcher/format'
import type { MatcherMeta, MatcherResult } from '@/types/matcher'
import { DutchCalculatorView } from './dutch-calculator-view'
import { OmSportIcon } from './om-ds'
import { PuntaBancaCalculatorView, type CalculatorDefaults } from './punta-banca-calculator-view'

interface MatcherCalculatorPanelProps {
  row: MatcherResult
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

const dayFormat = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** The calculator of the catalog behind each kind of row: its icon in the header. */
function toolOf(row: MatcherResult) {
  const slug: CalculatorSlug =
    row.matchType === 'back_lay'
      ? 'punta-banca'
      : row.legs.length === 3
        ? 'tri-punta'
        : 'punta-punta'
  return CALCULATOR_TOOLS.find((t) => t.slug === slug) ?? CALCULATOR_TOOLS[0]
}

/**
 * The calculator of a row of the Oddsmatcher, full screen as in the design of §14.273: the panel
 * of the calculators with «‹ Oddsmatcher», the event (sport, competition, market, day and time,
 * the two teams), then Punta-Banca on a back/lay row or dutching on a two- or three-way row. The
 * view is keyed by the row, so it mounts fresh with the row's prices and the shared amounts.
 */
export function MatcherCalculatorPanel({
  row,
  meta,
  defaults,
  commissionPercent,
  onClose,
}: MatcherCalculatorPanelProps) {
  const event = useMemo(() => betEventInfo(row), [row])
  const backLay = row.matchType === 'back_lay'
  const title = backLay ? 'Calcolatore punta - banca' : `Calcolatore punta - ${row.legs.length} vie`
  const shortTitle = backLay ? 'Punta - banca' : `Punta - ${row.legs.length} vie`
  const sport = sportDisplay(row.sportName)

  return (
    <CalculatorPanel
      tool={toolOf(row)}
      title={title}
      shortTitle={shortTitle}
      backLabel="Oddsmatcher"
      onClose={onClose}
    >
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <div className="ds-body-sm flex flex-wrap items-center gap-x-2 gap-y-1 text-ds-ink-muted">
            <span className="inline-flex text-ds-ink">
              <OmSportIcon sport={row.sportName} size={20} />
            </span>
            <span className="ds-label uppercase">{sport.label}</span>
            <span>{row.competitionName}</span>
            <span className="text-ds-line-strong" aria-hidden>
              ·
            </span>
            <span>{event.mercato}</span>
            <span className="text-ds-line-strong" aria-hidden>
              ·
            </span>
            <span className="tabular-nums">
              {dayFormat.format(new Date(row.startTime))} · {formatKickoffTime(row.startTime)}
            </span>
          </div>
          <h2 className="ds-display m-0 [text-wrap:balance]">
            {row.homeName ?? '?'} <span className="font-normal text-ds-ink-muted">–</span>{' '}
            {row.awayName ?? '?'}
          </h2>
        </header>

        {backLay ? (
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
    </CalculatorPanel>
  )
}

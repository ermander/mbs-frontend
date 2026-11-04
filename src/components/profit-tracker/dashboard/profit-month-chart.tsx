'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import {
  MONTH_FULL,
  MONTH_SHORT,
  chartScale,
  cumulativeSeries,
  dashMoney,
  dashMoneyRound,
  scalePosition,
} from '@/lib/profit-tracker/dashboard'
import { cn } from '@/lib/utils'

type View = 'mensile' | 'cumulato'

const CHART_H = 240

/**
 * «Profitto mese per mese» del design OddWise Dashboard (§14.336): barre in CSS sui token ds-*, con
 * l'interruttore Mensile/Cumulato. Rispetto al design l'asse scende sotto lo zero se serve: le barre
 * in perdita scendono dalla linea dello zero in colore loss.
 */
export function ProfitMonthChart({
  year,
  series,
  currentMonth,
  isLoading,
  isEmpty,
}: {
  year: number
  /** Dodici valori, null per i mesi non ancora iniziati. */
  series: (number | null)[]
  /** Indice del mese in corso, -1 se l'anno non è quello corrente. */
  currentMonth: number
  isLoading: boolean
  isEmpty: boolean
}) {
  const [view, setView] = useState<View>('mensile')
  const cum = view === 'cumulato'

  const shown = useMemo(() => (cum ? cumulativeSeries(series) : series), [cum, series])
  const scale = useMemo(() => chartScale(shown), [shown])
  const zero = scalePosition(0, scale)

  const bars = shown.map((v, i) => {
    const future = v === null
    const pos = future ? zero : scalePosition(v, scale)
    const h = future || v === 0 ? 0 : Math.max(2, Math.abs(pos - zero) * CHART_H)
    const negative = !future && v < 0
    const current = i === currentMonth
    return {
      i,
      v,
      future,
      negative,
      current,
      h,
      valueLabel: future || v === 0 ? '' : dashMoneyRound(v),
      title: future
        ? `${MONTH_FULL[i]} ${year}: mese non ancora iniziato`
        : `${MONTH_FULL[i]} ${year}: ${dashMoney(v)}${cum ? ' cumulati' : ''}${current ? ', mese in corso' : ''}`,
    }
  })

  const aria = `Grafico a barre del profitto ${cum ? 'cumulato' : 'mensile'} del ${year}: ${bars
    .filter((b) => b.valueLabel)
    .map((b) => `${MONTH_SHORT[b.i]} ${b.valueLabel}`)
    .join(', ')}`

  return (
    <div className="flex flex-col gap-6 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 pt-5 pb-6 shadow-ds-sm sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="ds-heading m-0">Profitto mese per mese</h3>
          <p className="ds-body-sm m-0 text-ds-ink-muted">
            {cum
              ? 'Profitto accumulato da gennaio, giocate archiviate'
              : 'Profitto realizzato in ciascun mese, giocate archiviate'}
          </p>
        </div>
        <div
          role="group"
          aria-label="Vista del grafico"
          className="inline-flex gap-0.5 rounded-ds-sm border border-ds-line bg-ds-surface p-[3px]"
        >
          {(['mensile', 'cumulato'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                'h-7 cursor-pointer rounded-ds-xs border-0 px-3 font-ds-sans text-sm leading-5 font-semibold transition-colors duration-150',
                dsFocusRing,
                view === v ? 'bg-ds-brand-soft text-ds-brand' : 'bg-transparent text-ds-ink-muted',
              )}
            >
              {v === 'mensile' ? 'Mensile' : 'Cumulato'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div
          aria-busy="true"
          aria-label="Caricamento del grafico"
          className="h-[268px] animate-pulse rounded-ds-sm bg-ds-surface-sunken"
        />
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span
            aria-hidden
            className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted"
          >
            <TrendingUp className="h-8 w-8" strokeWidth={1.75} />
          </span>
          <h3 className="m-0 font-ds-sans text-xl leading-7 font-semibold">
            Nessun profitto registrato nel {year}
          </h3>
          <p className="ds-body m-0 max-w-[440px] text-ds-ink-muted">
            Quando archivi la prima giocata chiusa, il suo profitto compare qui mese per mese.
          </p>
          <div className="mt-3">
            <Link
              href="/profit-tracker/giocate-in-corso"
              className={cn(dsButtonClass('primary', 'md'), 'gap-2')}
            >
              Vai alle giocate in corso
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div
          role="img"
          aria-label={aria}
          className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-x-3"
        >
          <div className="relative" style={{ height: CHART_H }}>
            {scale.ticks.map((t) => (
              <span
                key={t}
                className="absolute right-0 translate-y-1/2 font-ds-sans text-xs leading-4 font-medium whitespace-nowrap text-ds-ink-muted tabular-nums sm:text-sm sm:leading-5"
                style={{ bottom: `${scalePosition(t, scale) * 100}%` }}
              >
                {dashMoneyRound(t)}
              </span>
            ))}
          </div>
          <div className="relative" style={{ height: CHART_H }}>
            {scale.ticks.map((t) => (
              <div
                key={t}
                aria-hidden
                className={cn(
                  'absolute inset-x-0 border-t',
                  t === 0 ? 'border-ds-line-strong' : 'border-ds-line',
                )}
                style={{ bottom: `${scalePosition(t, scale) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 grid grid-cols-12">
              {bars.map((b) => (
                <div key={b.i} title={b.title} className="relative min-w-0">
                  <div
                    className={cn(
                      'absolute left-1/2 w-[56%] max-w-12 -translate-x-1/2 transition-[height,background-color] duration-150',
                      b.negative
                        ? 'rounded-b-[3px] bg-ds-loss'
                        : b.current
                          ? 'rounded-t-[3px] bg-ds-brand-hover'
                          : 'rounded-t-[3px] bg-ds-brand',
                    )}
                    style={
                      b.negative
                        ? { top: `${(1 - zero) * 100}%`, height: b.h }
                        : { bottom: `${zero * 100}%`, height: b.h }
                    }
                  />
                  {b.valueLabel && (
                    <span
                      className="ds-caption absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-ds-ink-muted tabular-nums sm:block"
                      style={
                        b.negative
                          ? { top: `calc(${(1 - zero) * 100}% + ${b.h + 6}px)` }
                          : { bottom: `calc(${zero * 100}% + ${b.h + 6}px)` }
                      }
                    >
                      {b.valueLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div />
          <div className="grid grid-cols-12 pt-2">
            {bars.map((b) => (
              <span
                key={b.i}
                className={cn(
                  'text-center font-ds-sans text-xs leading-4 sm:text-sm sm:leading-5',
                  b.current
                    ? 'font-semibold text-ds-brand'
                    : b.future
                      ? 'text-ds-ink-faint'
                      : 'text-ds-ink-muted',
                )}
              >
                {MONTH_SHORT[b.i]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

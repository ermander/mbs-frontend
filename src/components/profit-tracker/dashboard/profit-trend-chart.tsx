'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { BetLegRealizedLedgerSummaryBucket } from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

const MONTH_LABELS = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
]
const MONTH_LABELS_FULL = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

// Stessa polarità del grafico del Report: guadagno sul primario, perdita sul distruttivo.
const POSITIVE_COLOR = 'hsl(var(--primary))'
const NEGATIVE_COLOR = 'hsl(var(--destructive))'
const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }

type TrendMode = 'mensile' | 'cumulato'

interface TrendDatum {
  month: number
  label: string
  /** null per i mesi non ancora iniziati: il grafico tiene l'anno intero senza disegnarli. */
  mensile: number | null
  cumulato: number | null
}

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(value)
  return value > 0 ? `+${formatted}` : formatted
}

function formatAxisCurrency(value: number): string {
  return value.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

/** Totali per mese (UTC, come il Report) e somma progressiva fino al mese in corso. */
function buildTrendData(
  buckets: BetLegRealizedLedgerSummaryBucket[],
  year: number,
  now: Date,
): TrendDatum[] {
  const totals = new Array(12).fill(0) as number[]
  for (const bucket of buckets) {
    const date = new Date(bucket.periodStart)
    if (date.getUTCFullYear() === year) totals[date.getUTCMonth()] += bucket.total
  }
  const lastMonth = now.getFullYear() > year ? 11 : now.getFullYear() < year ? -1 : now.getMonth()
  const data: TrendDatum[] = []
  let running = 0
  for (let month = 0; month < 12; month++) {
    if (month > lastMonth) {
      data.push({ month, label: MONTH_LABELS[month], mensile: null, cumulato: null })
      continue
    }
    running += totals[month]
    data.push({ month, label: MONTH_LABELS[month], mensile: totals[month], cumulato: running })
  }
  return data
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: TrendDatum }[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0].payload
  if (datum.mensile == null || datum.cumulato == null) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{MONTH_LABELS_FULL[datum.month]}</p>
      <p
        className={cn(
          'mt-0.5 font-mono tabular-nums',
          datum.mensile >= 0 ? 'text-foreground' : 'text-destructive',
        )}
      >
        Nel mese {formatSignedCurrency(datum.mensile)}
      </p>
      <p className="font-mono tabular-nums text-muted-foreground">
        Da inizio anno {formatSignedCurrency(datum.cumulato)}
      </p>
    </div>
  )
}

export function ProfitTrendChart({
  year,
  buckets,
  isLoading,
}: {
  year: number
  buckets: BetLegRealizedLedgerSummaryBucket[]
  isLoading: boolean
}) {
  const [mode, setMode] = useState<TrendMode>('mensile')

  const data = useMemo(() => buildTrendData(buckets, year, new Date()), [buckets, year])

  const lastCumulato = data.reduce<number>((acc, d) => (d.cumulato == null ? acc : d.cumulato), 0)
  const areaColor = lastCumulato >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Trend guadagni {year}</p>
          <p className="text-xs text-muted-foreground">
            {mode === 'mensile'
              ? 'Profitto realizzato mese per mese'
              : 'Profitto realizzato accumulato da inizio anno'}
          </p>
        </div>
        <div className="flex self-start rounded-md border border-border p-0.5 text-xs sm:self-auto">
          {(['mensile', 'cumulato'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              className={cn(
                'rounded px-2 py-1 font-medium',
                mode === m
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setMode(m)}
            >
              {m === 'mensile' ? 'Mensile' : 'Cumulato'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-56 sm:h-64">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-md bg-muted/40" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {mode === 'mensile' ? (
              <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  interval="preserveStartEnd"
                  minTickGap={6}
                />
                <YAxis
                  width={64}
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.6)' }} content={<TrendTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.5)" />
                <Bar dataKey="mensile" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {data.map((d) => (
                    <Cell
                      key={d.month}
                      fill={(d.mensile ?? 0) >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profit-trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={areaColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  interval="preserveStartEnd"
                  minTickGap={6}
                />
                <YAxis
                  width={64}
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
                  content={<TrendTooltip />}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.5)" />
                <Area
                  type="monotone"
                  dataKey="cumulato"
                  stroke={areaColor}
                  strokeWidth={2}
                  fill="url(#profit-trend-fill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

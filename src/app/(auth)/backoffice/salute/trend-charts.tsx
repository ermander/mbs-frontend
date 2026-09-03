'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getOddsHealthHistory } from '@/services/api/odds-collection-client'
import type { MetricsHistory } from '@/types/odds-collection'

const POLL_MS = 60_000

// Colore per bookmaker fisso sull'entità (non sulla posizione): un filtro o un
// bookmaker assente non ridipinge gli altri. Ordine validato per CVD sulla
// superficie bianca delle card (chart-1..4 dei token dell'app).
const BOOKMAKER_COLORS: Record<string, string> = {
  betfairsportsbook: 'hsl(var(--chart-1))',
  betsson: 'hsl(var(--chart-2))',
  bwin: 'hsl(var(--chart-3))',
  sisal: 'hsl(var(--chart-4))',
}
const FALLBACK_COLOR = 'hsl(var(--chart-5))'
const SINGLE_COLOR = 'hsl(var(--chart-2))'

const BOOKMAKER_LABELS: Record<string, string> = {
  betfairsportsbook: 'Betfair',
  betsson: 'Betsson',
  bwin: 'Bwin',
  sisal: 'Sisal',
}

const RANGES = [
  { label: '6 h', hours: 6 },
  { label: '24 h', hours: 24 },
  { label: '7 g', hours: 168 },
  { label: '14 g', hours: 336 },
]

interface ChartDef {
  title: string
  metric: string
  perBookmaker?: boolean
  unit?: 'count' | 'ms'
  hint?: string
}

const CHARTS: ChartDef[] = [
  { title: 'Quote scritte', metric: 'ingest_odds_written', perBookmaker: true, hint: 'create + aggiornate per intervallo' },
  { title: 'Quote attive', metric: 'odds_active', perBookmaker: true },
  { title: 'Coda di revisione', metric: 'review_queue_pending', hint: 'orfani in attesa' },
  { title: 'Righe del matcher', metric: 'matcher_rows' },
  { title: 'Durata rebuild', metric: 'rebuild_duration_ms', unit: 'ms' },
  { title: 'Durata refresh', metric: 'refresh_duration_ms', unit: 'ms' },
]

function formatValue(v: number, unit?: 'count' | 'ms'): string {
  if (unit === 'ms') {
    if (v >= 60_000) return `${(v / 60_000).toFixed(1)} min`
    if (v >= 1000) return `${(v / 1000).toFixed(1)} s`
    return `${Math.round(v)} ms`
  }
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`
  if (v >= 10_000) return `${Math.round(v / 1000)} k`
  if (v >= 1000) return `${(v / 1000).toFixed(1)} k`
  return Math.round(v).toLocaleString('it-IT')
}

function bookmakerColor(slug: string): string {
  return BOOKMAKER_COLORS[slug] ?? FALLBACK_COLOR
}

function bookmakerLabel(slug: string): string {
  return BOOKMAKER_LABELS[slug] ?? slug
}

type Row = { t: number } & Record<string, number>

/** Una riga per bucket temporale; le chiavi sono gli slug (o 'v' per la serie globale). */
function pivot(history: MetricsHistory, metric: string, perBookmaker: boolean): { rows: Row[]; keys: string[] } {
  const series = history.series.filter((s) => s.metric === metric)
  const keys = perBookmaker ? series.map((s) => s.bookmaker).sort() : ['v']
  const byTime = new Map<number, Row>()
  for (const s of series) {
    const key = perBookmaker ? s.bookmaker : 'v'
    for (const p of s.points) {
      const t = new Date(p.t).getTime()
      let row = byTime.get(t)
      if (!row) {
        row = { t } as Row
        byTime.set(t, row)
      }
      row[key] = p.v
    }
  }
  return { rows: Array.from(byTime.values()).sort((a, b) => a.t - b.t), keys }
}

function TrendTooltip({
  active,
  payload,
  label,
  unit,
  perBookmaker,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number | string; stroke?: string }>
  label?: number
  unit?: 'count' | 'ms'
  perBookmaker?: boolean
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">
        {label
          ? new Date(label).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : ''}
      </p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.stroke }} />
          <span className="text-muted-foreground">
            {perBookmaker ? bookmakerLabel(String(entry.dataKey)) : 'Valore'}
          </span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
            {typeof entry.value === 'number' ? formatValue(entry.value, unit) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function TrendChart({ def, history }: { def: ChartDef; history: MetricsHistory }) {
  const { rows, keys } = useMemo(
    () => pivot(history, def.metric, Boolean(def.perBookmaker)),
    [history, def.metric, def.perBookmaker],
  )
  const shortRange = history.hours <= 48

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs font-medium text-foreground">{def.title}</p>
        {def.hint && <p className="text-[11px] text-muted-foreground">{def.hint}</p>}
      </div>
      {rows.length === 0 ? (
        <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
          Ancora nessun campione
        </div>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                minTickGap={40}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleString(
                    'it-IT',
                    shortRange ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit' },
                  )
                }
              />
              <YAxis
                width={44}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v: number) => formatValue(v, def.unit)}
              />
              <Tooltip content={<TrendTooltip unit={def.unit} perBookmaker={def.perBookmaker} />} />
              {keys.map((key) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={def.perBookmaker ? bookmakerColor(key) : SINGLE_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {def.perBookmaker && keys.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {keys.map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: bookmakerColor(key) }} />
              {bookmakerLabel(key)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function TrendCharts() {
  const [hours, setHours] = useState(24)
  const [history, setHistory] = useState<MetricsHistory | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async (h: number) => {
    try {
      const data = await getOddsHealthHistory(h)
      setHistory(data)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens asynchronously after await, not synchronously
    void load(hours)
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void load(hours)
    }, POLL_MS)
    return () => clearInterval(poll)
  }, [load, hours])

  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Andamento</h3>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              type="button"
              onClick={() => setHours(r.hours)}
              className={`rounded px-2 py-1 text-xs ${
                hours === r.hours
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3">
        {error && <p className="mb-2 text-xs text-destructive">Errore nel caricamento della storia delle metriche.</p>}
        {!history && !error && <p className="py-6 text-center text-xs text-muted-foreground">Caricamento...</p>}
        {history && (
          <>
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              {CHARTS.map((def) => (
                <TrendChart key={def.metric} def={def} history={history} />
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Campioni ogni {history.sampleMinutes} min, aggregati a {history.stepMinutes} min · retention {history.retentionDays} giorni
            </p>
          </>
        )}
      </div>
    </section>
  )
}

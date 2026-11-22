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
import { BoMuted, BoPanel } from '@/components/backoffice/backoffice-ds'
import { DsAlert, DsSegmented } from '@/components/profit-tracker/tracker-ds'
import { getOddsHealthHistory } from '@/services/api/odds-collection-client'
import type { MetricsHistory } from '@/types/odds-collection'

const POLL_MS = 60_000

// Colore per bookmaker fisso sull'entità (non sulla posizione): un filtro o un
// bookmaker assente non ridipinge gli altri. Dal §14.365 i cinque colori categoriali
// per il riquadro bianco del design (blu, arancio, acqua, giallo, magenta), validati
// per CVD su #ffffff; i tre più chiari stanno sotto 3:1 col fondo, per cui l'identità
// la portano anche la legenda e il tooltip coi nomi.
const BOOKMAKER_COLORS: Record<string, string> = {
  betfairsportsbook: '#2a78d6',
  betsson: '#eb6834',
  bwin: '#1baf7a',
  sisal: '#eda100',
}
const FALLBACK_COLOR = '#e87ba4'
const SINGLE_COLOR = '#2a78d6'
const GRID_COLOR = 'var(--ds-line)'
const TICK_COLOR = 'var(--ds-ink-muted)'

const BOOKMAKER_LABELS: Record<string, string> = {
  betfairsportsbook: 'Betfair',
  betsson: 'Betsson',
  bwin: 'Bwin',
  sisal: 'Sisal',
}

const RANGES = [
  { label: '6 h', value: '6' },
  { label: '24 h', value: '24' },
  { label: '7 g', value: '168' },
  { label: '14 g', value: '336' },
]

type Unit = 'count' | 'ms' | 's' | 'bytes'

interface ChartDef {
  title: string
  metric: string
  perBookmaker?: boolean
  unit?: Unit
  hint?: string
}

const CHARTS: ChartDef[] = [
  {
    title: 'Quote scritte',
    metric: 'ingest_odds_written',
    perBookmaker: true,
    hint: 'create + aggiornate per intervallo',
  },
  { title: 'Quote attive', metric: 'odds_active', perBookmaker: true },
  // §14.145: età delle quote attive (adesso − last_seen_at) sugli eventi entro 24 h dal kickoff,
  // per bookmaker: la freschezza che il refresh consegna davvero.
  {
    title: 'Età quote p50 (≤24 h)',
    metric: 'odds_age_p50_s',
    perBookmaker: true,
    unit: 's',
    hint: 'mediana di adesso − visto',
  },
  {
    title: 'Età quote p90 (≤24 h)',
    metric: 'odds_age_p90_s',
    perBookmaker: true,
    unit: 's',
    hint: '90º percentile di adesso − visto',
  },
  { title: 'Coda di revisione', metric: 'review_queue_pending', hint: 'orfani in attesa' },
  { title: 'Righe del matcher', metric: 'matcher_rows' },
  { title: 'Durata rebuild', metric: 'rebuild_duration_ms', unit: 'ms' },
  { title: 'Durata refresh', metric: 'refresh_duration_ms', unit: 'ms' },
  // §14.219: byte usciti dal proxy residenziale (forwarder mbs-proxy), per bookmaker; il giorno è UTC.
  {
    title: 'Proxy: traffico del giorno',
    metric: 'proxy_bytes_day',
    perBookmaker: true,
    unit: 'bytes',
    hint: 'byte su e giù dal proxy residenziale, giorno UTC',
  },
  {
    title: 'Proxy: traffico del mese',
    metric: 'proxy_bytes_month',
    perBookmaker: true,
    unit: 'bytes',
    hint: 'cumulato del mese',
  },
]

function formatValue(v: number, unit?: Unit): string {
  if (unit === 'bytes') {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} GB`
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)} MB`
    if (v >= 1e3) return `${Math.round(v / 1e3)} kB`
    return `${Math.round(v)} B`
  }
  if (unit === 's') {
    if (v >= 3600) return `${(v / 3600).toFixed(1)} h`
    if (v >= 60) return `${(v / 60).toFixed(1)} min`
    return `${Math.round(v)} s`
  }
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
function pivot(
  history: MetricsHistory,
  metric: string,
  perBookmaker: boolean,
): { rows: Row[]; keys: string[] } {
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
  unit?: Unit
  perBookmaker?: boolean
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-ds-sm border border-ds-line bg-ds-surface-raised px-3 py-2 text-xs text-ds-ink shadow-ds-md">
      <p className="m-0 mb-1 font-semibold text-ds-ink">
        {label
          ? new Date(label).toLocaleString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''}
      </p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.stroke }}
          />
          <span className="text-ds-ink-muted">
            {perBookmaker ? bookmakerLabel(String(entry.dataKey)) : 'Valore'}
          </span>
          <span className="ml-auto pl-3 font-semibold text-ds-ink tabular-nums">
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
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="m-0 text-sm font-semibold text-ds-ink">{def.title}</p>
        {def.hint && <p className="ds-caption m-0 text-right text-ds-ink-muted">{def.hint}</p>}
      </div>
      {rows.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-ds-sm bg-ds-surface-sunken/50 text-xs text-ds-ink-muted">
          Ancora nessun campione
        </div>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="0" />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={false}
                minTickGap={40}
                tick={{ fill: TICK_COLOR, fontSize: 10 }}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleString(
                    'it-IT',
                    shortRange
                      ? { hour: '2-digit', minute: '2-digit' }
                      : { day: '2-digit', month: '2-digit' },
                  )
                }
              />
              <YAxis
                width={44}
                axisLine={false}
                tickLine={false}
                tick={{ fill: TICK_COLOR, fontSize: 10 }}
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
            <span key={key} className="flex items-center gap-1.5 text-xs text-ds-ink-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: bookmakerColor(key) }}
              />
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
    <BoPanel
      title="Andamento"
      actions={
        <DsSegmented
          label="Periodo"
          items={RANGES}
          value={String(hours)}
          onChange={(v) => setHours(Number(v))}
        />
      }
    >
      {error && (
        <DsAlert className="mb-3">Errore nel caricamento della storia delle metriche.</DsAlert>
      )}
      {!history && !error && (
        <BoMuted className="py-6 text-center">Caricamento dell’andamento…</BoMuted>
      )}
      {history && (
        <>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {CHARTS.map((def) => (
              <TrendChart key={def.metric} def={def} history={history} />
            ))}
          </div>
          <p className="ds-caption m-0 mt-4 text-ds-ink-muted">
            Campioni ogni {history.sampleMinutes} min, aggregati a {history.stepMinutes} min ·
            retention {history.retentionDays} giorni
          </p>
        </>
      )}
    </BoPanel>
  )
}

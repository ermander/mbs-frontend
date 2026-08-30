'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
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

import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getProfitReport, getProfitReportDetail } from '@/services/api/profit-tracker-client'
import { PROFIT_CATEGORIES, getCategoryLabel } from '@/lib/profit-tracker/categories'
import type {
  ProfitReportDetailItem,
  ProfitReportResult,
} from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const MONTH_LABELS_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

const POSITIVE_COLOR = 'hsl(var(--primary))'
const NEGATIVE_COLOR = 'hsl(var(--destructive))'

const DETAIL_PAGE_SIZE = 15

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(value)
  return value > 0 ? `+${formatted}` : formatted
}

/** Estrae anno/mese (UTC) da un periodStart ISO restituito dal backend. */
function monthIndexOf(periodStart: string): { year: number; month: number } {
  const d = new Date(periodStart)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

interface BreakdownRow {
  key: string
  label: string
  totale: number
  giocate: number
}

function BreakdownCard({
  title,
  rows,
  emptyLabel,
}: {
  title: string
  rows: BreakdownRow[]
  emptyLabel: string
}) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.totale)), 1)
  const totalPositive = rows.reduce((sum, r) => sum + r.totale, 0)
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => {
            const share =
              totalPositive !== 0 ? (row.totale / totalPositive) * 100 : 0
            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{row.label}</span>
                  <span
                    className={cn(
                      'shrink-0 font-medium tabular-nums',
                      row.totale >= 0 ? 'text-foreground' : 'text-destructive',
                    )}
                  >
                    {formatSignedCurrency(row.totale)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        row.totale >= 0 ? 'bg-primary' : 'bg-destructive',
                      )}
                      style={{ width: `${(Math.abs(row.totale) / maxAbs) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {row.giocate} giocate
                    {totalPositive !== 0 && row.totale >= 0
                      ? ` · ${share.toFixed(0)}%`
                      : ''}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface MonthChartDatum {
  month: number
  label: string
  totale: number
  giocate: number
}

function MonthTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: MonthChartDatum }[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{MONTH_LABELS_FULL[datum.month]}</p>
      <p className={cn('mt-0.5 tabular-nums', datum.totale >= 0 ? 'text-foreground' : 'text-destructive')}>
        {formatSignedCurrency(datum.totale)}
      </p>
      <p className="mt-0.5 text-muted-foreground">{datum.giocate} giocate</p>
    </div>
  )
}

export default function ReportPage() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const allBooks = useProfitTrackerStore((s) => s.allBooks)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [holderId, setHolderId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const [report, setReport] = useState<ProfitReportResult | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(true)
  const [reportError, setReportError] = useState<string | null>(null)

  const [detailItems, setDetailItems] = useState<ProfitReportDetailItem[]>([])
  const [detailTotal, setDetailTotal] = useState(0)
  const [detailPage, setDetailPage] = useState(1)
  const [isLoadingDetail, setIsLoadingDetail] = useState(true)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchAllHolders()
    void fetchAllBooks()
  }, [fetchAllAccounts, fetchAllHolders, fetchAllBooks])

  const baseFilters = useMemo(
    () => ({
      fromDate: new Date(Date.UTC(year, 0, 1)).toISOString(),
      toDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString(),
      holderId: holderId || undefined,
      accountId: accountId || undefined,
      categoria: categoria || undefined,
    }),
    [year, holderId, accountId, categoria],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoadingReport(true)
    setReportError(null)
    getProfitReport(baseFilters)
      .then((result) => {
        if (!cancelled) setReport(result)
      })
      .catch(() => {
        if (!cancelled) setReportError('Errore nel caricamento del report')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReport(false)
      })
    return () => {
      cancelled = true
    }
  }, [baseFilters])

  // Il dettaglio segue anche il mese selezionato (drill-down dal grafico)
  const detailFilters = useMemo(() => {
    if (selectedMonth == null) return baseFilters
    return {
      ...baseFilters,
      fromDate: new Date(Date.UTC(year, selectedMonth, 1)).toISOString(),
      toDate: new Date(Date.UTC(year, selectedMonth + 1, 0, 23, 59, 59)).toISOString(),
    }
  }, [baseFilters, selectedMonth, year])

  useEffect(() => {
    setDetailPage(1)
  }, [detailFilters])

  useEffect(() => {
    let cancelled = false
    setIsLoadingDetail(true)
    getProfitReportDetail({ ...detailFilters, page: detailPage, limit: DETAIL_PAGE_SIZE })
      .then((result) => {
        if (cancelled) return
        setDetailItems(result.items)
        setDetailTotal(result.total)
      })
      .catch(() => {
        if (cancelled) return
        setDetailItems([])
        setDetailTotal(0)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [detailFilters, detailPage])

  const chartData: MonthChartDatum[] = useMemo(() => {
    const months: MonthChartDatum[] = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: MONTH_LABELS[i],
      totale: 0,
      giocate: 0,
    }))
    for (const bucket of report?.buckets ?? []) {
      const { year: y, month } = monthIndexOf(bucket.periodStart)
      if (y === year) {
        months[month].totale = bucket.totale
        months[month].giocate = bucket.giocate
      }
    }
    return months
  }, [report, year])

  const kpi = useMemo(() => {
    const totale = report?.totale ?? 0
    const giocate = report?.giocate ?? 0
    const monthsWithData = chartData.filter((m) => m.giocate > 0)
    const media = monthsWithData.length > 0 ? totale / monthsWithData.length : 0
    const best = monthsWithData.reduce<MonthChartDatum | null>(
      (acc, m) => (acc == null || m.totale > acc.totale ? m : acc),
      null,
    )
    return { totale, giocate, media, best }
  }, [report, chartData])

  // Le suddivisioni rispettano anche il mese selezionato
  const visibleRows = useMemo(() => {
    const rows = report?.rows ?? []
    if (selectedMonth == null) return rows
    return rows.filter((r) => {
      const { year: y, month } = monthIndexOf(r.periodStart)
      return y === year && month === selectedMonth
    })
  }, [report, selectedMonth, year])

  const buildBreakdown = useCallback(
    (
      keyOf: (row: { categoria: string; accountId: string; holderId: string; bookId: string }) => string,
      labelOf: (key: string) => string,
    ): BreakdownRow[] => {
      const map = new Map<string, { totale: number; giocate: number }>()
      for (const row of visibleRows) {
        const key = keyOf(row)
        const entry = map.get(key) ?? { totale: 0, giocate: 0 }
        entry.totale += row.totale
        entry.giocate += row.giocate
        map.set(key, entry)
      }
      return Array.from(map.entries())
        .map(([key, v]) => ({ key, label: labelOf(key), ...v }))
        .sort((a, b) => b.totale - a.totale)
    },
    [visibleRows],
  )

  const byCategoria = useMemo(
    () => buildBreakdown((r) => r.categoria, getCategoryLabel),
    [buildBreakdown],
  )
  const byHolder = useMemo(
    () =>
      buildBreakdown(
        (r) => r.holderId,
        (id) => allHolders.find((h) => h.id === id)?.nome ?? 'Sconosciuto',
      ),
    [buildBreakdown, allHolders],
  )
  const byAccount = useMemo(
    () =>
      buildBreakdown(
        (r) => r.accountId,
        (id) => {
          const account = allAccounts.find((a) => a.id === id)
          if (!account) return 'Sconosciuto'
          const book = allBooks.find((b) => b.id === account.bookId)
          const holder = allHolders.find((h) => h.id === account.holderId)
          return book && holder ? `${book.nome} (${holder.nome})` : account.nome
        },
      ),
    [buildBreakdown, allAccounts, allBooks, allHolders],
  )

  const accountLabel = useCallback(
    (id: string) => {
      const account = allAccounts.find((a) => a.id === id)
      if (!account) return '—'
      const book = allBooks.find((b) => b.id === account.bookId)
      const holder = allHolders.find((h) => h.id === account.holderId)
      return book && holder ? `${book.nome} (${holder.nome})` : account.nome
    },
    [allAccounts, allBooks, allHolders],
  )

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => ({
        value: String(y),
        label: String(y),
      })),
    [currentYear],
  )

  const holderOptions = useMemo(
    () => allHolders.map((h) => ({ value: h.id, label: h.nome })),
    [allHolders],
  )

  const accountOptions = useMemo(
    () =>
      allAccounts.map((a) => {
        const book = allBooks.find((b) => b.id === a.bookId)
        const holder = allHolders.find((h) => h.id === a.holderId)
        return {
          value: a.id,
          label: book && holder ? `${book.nome} (${holder.nome})` : a.nome,
        }
      }),
    [allAccounts, allBooks, allHolders],
  )

  const categoryOptions = useMemo(
    () => PROFIT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    [],
  )

  const totalDetailPages = Math.max(1, Math.ceil(detailTotal / DETAIL_PAGE_SIZE))
  const periodoLabel =
    selectedMonth == null ? `Anno ${year}` : `${MONTH_LABELS_FULL[selectedMonth]} ${year}`

  return (
    <ProfitTrackerPageShell
      sectionTitle="Report"
      sectionDescription="Analisi dei profitti per periodo, identità, conto e categoria"
    >
      {/* Filtri */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          id="report-anno"
          label="Anno"
          options={yearOptions}
          value={String(year)}
          onChange={(v) => {
            setYear(Number(v))
            setSelectedMonth(null)
          }}
          allowEmpty={false}
          size="sm"
        />
        <SearchableSelect
          id="report-identita"
          label="Identità"
          placeholder="Tutte"
          searchPlaceholder="Cerca identità..."
          options={holderOptions}
          value={holderId}
          onChange={setHolderId}
          size="sm"
        />
        <SearchableSelect
          id="report-conto"
          label="Conto scommesse"
          placeholder="Tutti"
          searchPlaceholder="Cerca conto..."
          options={accountOptions}
          value={accountId}
          onChange={setAccountId}
          size="sm"
        />
        <SearchableSelect
          id="report-categoria"
          label="Categoria"
          placeholder="Tutte"
          searchPlaceholder="Cerca categoria..."
          options={categoryOptions}
          value={categoria}
          onChange={setCategoria}
          size="sm"
        />
      </div>

      {reportError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {reportError}
        </p>
      ) : null}

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Profitto {year}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold',
              kpi.totale >= 0 ? 'text-foreground' : 'text-destructive',
            )}
          >
            {isLoadingReport ? '—' : formatSignedCurrency(kpi.totale)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Giocate</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {isLoadingReport ? '—' : kpi.giocate}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Media mensile</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {isLoadingReport ? '—' : formatSignedCurrency(kpi.media)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Miglior mese</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {isLoadingReport || !kpi.best
              ? '—'
              : `${MONTH_LABELS_FULL[kpi.best.month]}`}
          </p>
          {!isLoadingReport && kpi.best ? (
            <p className="text-xs text-muted-foreground">
              {formatSignedCurrency(kpi.best.totale)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Andamento mensile */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">Profitto mensile {year}</p>
            <p className="text-xs text-muted-foreground">
              Clicca su un mese per approfondire il dettaglio
            </p>
          </div>
          {selectedMonth != null ? (
            <Button variant="outline" size="sm" onClick={() => setSelectedMonth(null)}>
              Mostra tutto l&apos;anno
            </Button>
          ) : null}
        </div>
        <div className="mt-4 h-64">
          {isLoadingReport ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                onClick={(state) => {
                  const idx = state?.activeTooltipIndex
                  if (typeof idx === 'number') {
                    setSelectedMonth((prev) => (prev === idx ? null : idx))
                  }
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="0"
                />
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  width={72}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.6)' }}
                  content={<MonthTooltip />}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="totale" radius={[4, 4, 0, 0]} maxBarSize={40} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.totale >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                      opacity={selectedMonth == null || selectedMonth === entry.month ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Suddivisioni */}
      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownCard
          title={`Per categoria — ${periodoLabel}`}
          rows={byCategoria}
          emptyLabel="Nessun profitto registrato nel periodo"
        />
        <BreakdownCard
          title={`Per identità — ${periodoLabel}`}
          rows={byHolder}
          emptyLabel="Nessun profitto registrato nel periodo"
        />
        <BreakdownCard
          title={`Per conto — ${periodoLabel}`}
          rows={byAccount}
          emptyLabel="Nessun profitto registrato nel periodo"
        />
      </div>

      {/* Dettaglio giocate */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            Dettaglio giocate — {periodoLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {detailTotal} {detailTotal === 1 ? 'giocata' : 'giocate'}
          </p>
        </div>
        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : detailItems.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessuna giocata nel periodo selezionato.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Giocata</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Conto</th>
                  <th className="pb-2 text-right font-medium">Profitto</th>
                </tr>
              </thead>
              <tbody>
                {detailItems.map((item) => (
                  <tr
                    key={`${item.kind}-${item.id}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {new Date(item.data).toLocaleDateString('it-IT')}
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-foreground">
                      {item.kind === 'quick'
                        ? item.nome || 'Giocata rapida'
                        : item.nome || '—'}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {getCategoryLabel(item.categoria)}
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-muted-foreground">
                      {item.accountIds.map(accountLabel).join(', ')}
                    </td>
                    <td
                      className={cn(
                        'py-2 text-right font-medium tabular-nums whitespace-nowrap',
                        item.importo >= 0 ? 'text-foreground' : 'text-destructive',
                      )}
                    >
                      {formatSignedCurrency(item.importo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalDetailPages > 1 ? (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={detailPage <= 1 || isLoadingDetail}
              onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
            >
              Precedente
            </Button>
            <span className="text-xs text-muted-foreground">
              Pagina {detailPage} di {totalDetailPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={detailPage >= totalDetailPages || isLoadingDetail}
              onClick={() => setDetailPage((p) => Math.min(totalDetailPages, p + 1))}
            >
              Successiva
            </Button>
          </div>
        ) : null}
      </div>
    </ProfitTrackerPageShell>
  )
}

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
  ProfitReportDetailKind,
  ProfitReportResult,
  ProfitReportRow,
  ProfitReportSezione,
} from '@/types/profit-tracker'
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

const POSITIVE_COLOR = 'hsl(var(--primary))'
const NEGATIVE_COLOR = 'hsl(var(--destructive))'

const DETAIL_PAGE_SIZE = 15

const KIND_LABELS: Record<ProfitReportDetailKind, string> = {
  bet: 'Giocata',
  quick: 'Rapida',
  ricarica: 'Ricarica',
  spesa: 'Spesa',
}

const KIND_CLASS: Record<ProfitReportDetailKind, string> = {
  bet: 'border-neon-blue/20 bg-neon-blue/15 text-neon-blue',
  quick: 'border-neon-lavender/20 bg-neon-lavender/15 text-neon-lavender',
  ricarica: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-400',
  spesa: 'border-destructive/20 bg-destructive/15 text-destructive',
}

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

/** Etichetta di una riga del report: dal catalogo per i movimenti, statica per le giocate. */
function rowCategoryLabel(row: Pick<ProfitReportRow, 'categoria' | 'categoriaNome'>): string {
  return row.categoriaNome ?? getCategoryLabel(row.categoria)
}

interface BreakdownRow {
  key: string
  label: string
  totale: number
  count: number
  unit: 'giocate' | 'movimenti' | 'voci'
  note?: string
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
  // La quota è sul totale delle sole voci positive: con costi e spese in elenco il netto
  // farebbe superare il 100% alle entrate.
  const totalPositive = rows.filter((r) => r.totale > 0).reduce((sum, r) => sum + r.totale, 0)
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => {
            const share = totalPositive !== 0 ? (row.totale / totalPositive) * 100 : 0
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
                  <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                    {row.count} {row.unit}
                    {totalPositive !== 0 && row.totale >= 0 ? ` · ${share.toFixed(0)}%` : ''}
                  </span>
                </div>
                {row.note ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{row.note}</p>
                ) : null}
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
  netto: number
  profittoGiocate: number
  altreEntrate: number
  costiAttivita: number
  spesePersonali: number
  giocate: number
  movimenti: number
}

type ChartMode = 'netto' | 'giocate'

function MonthTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean
  payload?: { payload: MonthChartDatum }[]
  mode: ChartMode
}) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0].payload
  const main = mode === 'netto' ? datum.netto : datum.profittoGiocate
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{MONTH_LABELS_FULL[datum.month]}</p>
      <p className={cn('mt-0.5 tabular-nums', main >= 0 ? 'text-foreground' : 'text-destructive')}>
        {mode === 'netto' ? 'Netto ' : 'Giocate '}
        {formatSignedCurrency(main)}
      </p>
      <p className="mt-1 text-muted-foreground">
        Giocate {formatSignedCurrency(datum.profittoGiocate)} ({datum.giocate})
      </p>
      <p className="text-muted-foreground">Costi attività {formatCurrency(-datum.costiAttivita)}</p>
      <p className="text-muted-foreground">
        Altre entrate {formatSignedCurrency(datum.altreEntrate)}
      </p>
      <p className="text-muted-foreground">
        Spese personali {formatCurrency(-datum.spesePersonali)}
      </p>
    </div>
  )
}

interface CategoryAmount {
  key: string
  label: string
  totale: number
}

interface Statement {
  profittoGiocate: number
  altreEntrate: number
  costiAttivita: number
  spesePersonali: number
  nettoAttivita: number
  netto: number
  giocate: number
  movimenti: number
  bySection: Record<Exclude<ProfitReportSezione, 'giocate'>, CategoryAmount[]>
}

/** §14.111: il conto economico del periodo dalle righe del report (già filtrate per mese). */
function buildStatement(rows: ProfitReportRow[]): Statement {
  const sums: Record<ProfitReportSezione, number> = {
    giocate: 0,
    reddito: 0,
    costo_attivita: 0,
    spesa_personale: 0,
  }
  const counts = { giocate: 0, movimenti: 0 }
  const byCat: Record<Exclude<ProfitReportSezione, 'giocate'>, Map<string, CategoryAmount>> = {
    reddito: new Map(),
    costo_attivita: new Map(),
    spesa_personale: new Map(),
  }
  for (const row of rows) {
    sums[row.sezione] += row.totale
    if (row.sezione === 'giocate') {
      counts.giocate += row.giocate
    } else {
      counts.movimenti += row.giocate
      const map = byCat[row.sezione]
      const entry = map.get(row.categoria) ?? {
        key: row.categoria,
        label: rowCategoryLabel(row),
        totale: 0,
      }
      entry.totale += row.totale
      map.set(row.categoria, entry)
    }
  }
  const costiAttivita = -sums.costo_attivita
  const spesePersonali = -sums.spesa_personale
  const nettoAttivita = sums.giocate - costiAttivita
  const sortDesc = (map: Map<string, CategoryAmount>) =>
    Array.from(map.values()).sort((a, b) => Math.abs(b.totale) - Math.abs(a.totale))
  return {
    profittoGiocate: sums.giocate,
    altreEntrate: sums.reddito,
    costiAttivita,
    spesePersonali,
    nettoAttivita,
    netto: nettoAttivita + sums.reddito - spesePersonali,
    giocate: counts.giocate,
    movimenti: counts.movimenti,
    bySection: {
      reddito: sortDesc(byCat.reddito),
      costo_attivita: sortDesc(byCat.costo_attivita),
      spesa_personale: sortDesc(byCat.spesa_personale),
    },
  }
}

function StatementRow({
  label,
  value,
  sub,
  details,
  emphasis,
}: {
  label: string
  value: number
  sub?: string
  details?: CategoryAmount[]
  emphasis?: 'total' | 'final'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 py-2',
        emphasis ? 'border-t border-border' : '',
        emphasis === 'final' ? 'border-t-2' : '',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            'text-sm',
            emphasis ? 'font-semibold text-foreground' : 'text-foreground',
            emphasis === 'final' ? 'text-base' : '',
          )}
        >
          {label}
          {sub ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{sub}</span>
          ) : null}
        </span>
        <span
          className={cn(
            'shrink-0 font-medium tabular-nums',
            emphasis === 'final' ? 'text-lg' : 'text-sm',
            value >= 0 ? 'text-foreground' : 'text-destructive',
          )}
        >
          {formatSignedCurrency(value)}
        </span>
      </div>
      {details && details.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {details.map((d) => `${d.label} ${formatSignedCurrency(d.totale)}`).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

export default function ReportPage() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const allBooks = useProfitTrackerStore((s) => s.allBooks)
  const movementCategories = useProfitTrackerStore((s) => s.movementCategories)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchMovementCategories = useProfitTrackerStore((s) => s.fetchMovementCategories)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [holderId, setHolderId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [chartMode, setChartMode] = useState<ChartMode>('netto')

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
    void fetchMovementCategories()
  }, [fetchAllAccounts, fetchAllHolders, fetchAllBooks, fetchMovementCategories])

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
      netto: 0,
      profittoGiocate: 0,
      altreEntrate: 0,
      costiAttivita: 0,
      spesePersonali: 0,
      giocate: 0,
      movimenti: 0,
    }))
    for (const bucket of report?.buckets ?? []) {
      const { year: y, month } = monthIndexOf(bucket.periodStart)
      if (y === year) {
        months[month] = {
          ...months[month],
          netto: bucket.netto,
          profittoGiocate: bucket.profittoGiocate,
          altreEntrate: bucket.altreEntrate,
          costiAttivita: bucket.costiAttivita,
          spesePersonali: bucket.spesePersonali,
          giocate: bucket.giocate,
          movimenti: bucket.movimenti,
        }
      }
    }
    return months
  }, [report, year])

  // Le suddivisioni e il conto economico rispettano anche il mese selezionato
  const visibleRows = useMemo(() => {
    const rows = report?.rows ?? []
    if (selectedMonth == null) return rows
    return rows.filter((r) => {
      const { year: y, month } = monthIndexOf(r.periodStart)
      return y === year && month === selectedMonth
    })
  }, [report, selectedMonth, year])

  const statement = useMemo(() => buildStatement(visibleRows), [visibleRows])

  // §14.111: media e miglior mese sul netto del periodo (decisione dell'utente).
  const kpi = useMemo(() => {
    const monthsWithData = chartData.filter((m) => m.giocate > 0 || m.movimenti > 0)
    const netto = report?.netto ?? 0
    const media = monthsWithData.length > 0 ? netto / monthsWithData.length : 0
    const best = monthsWithData.reduce<MonthChartDatum | null>(
      (acc, m) => (acc == null || m.netto > acc.netto ? m : acc),
      null,
    )
    return { media, best }
  }, [report, chartData])

  const buildBreakdown = useCallback(
    (
      rows: ProfitReportRow[],
      keyOf: (row: ProfitReportRow) => string,
      labelOf: (key: string, row: ProfitReportRow) => string,
      unitOf: (row: ProfitReportRow) => BreakdownRow['unit'],
    ): BreakdownRow[] => {
      const map = new Map<string, BreakdownRow>()
      for (const row of rows) {
        const key = keyOf(row)
        const entry = map.get(key) ?? {
          key,
          label: labelOf(key, row),
          totale: 0,
          count: 0,
          unit: unitOf(row),
        }
        entry.totale += row.totale
        entry.count += row.giocate
        map.set(key, entry)
      }
      return Array.from(map.values()).sort((a, b) => b.totale - a.totale)
    },
    [],
  )

  const byCategoria = useMemo(
    () =>
      buildBreakdown(
        visibleRows,
        (r) => r.categoria,
        (_key, r) => rowCategoryLabel(r),
        (r) => (r.sezione === 'giocate' ? 'giocate' : 'movimenti'),
      ),
    [buildBreakdown, visibleRows],
  )

  // Per identità: il netto del collaboratore, con sotto le sue componenti.
  const byHolder = useMemo(() => {
    const rows = buildBreakdown(
      visibleRows,
      (r) => r.holderId,
      (id) => allHolders.find((h) => h.id === id)?.nome ?? 'Sconosciuto',
      () => 'voci',
    )
    return rows.map((row) => {
      const own = visibleRows.filter((r) => r.holderId === row.key)
      const st = buildStatement(own)
      const parts: string[] = []
      if (st.giocate > 0) parts.push(`giocate ${formatSignedCurrency(st.profittoGiocate)}`)
      if (st.costiAttivita !== 0) parts.push(`costi ${formatCurrency(-st.costiAttivita)}`)
      if (st.altreEntrate !== 0) parts.push(`entrate ${formatSignedCurrency(st.altreEntrate)}`)
      if (st.spesePersonali !== 0) parts.push(`spese ${formatCurrency(-st.spesePersonali)}`)
      return { ...row, note: parts.join(' · ') }
    })
  }, [buildBreakdown, visibleRows, allHolders])

  const byAccount = useMemo(
    () =>
      buildBreakdown(
        visibleRows.filter((r) => r.accountId !== null),
        (r) => r.accountId ?? '',
        (id) => {
          const account = allAccounts.find((a) => a.id === id)
          if (!account) return 'Sconosciuto'
          const book = allBooks.find((b) => b.id === account.bookId)
          const holder = allHolders.find((h) => h.id === account.holderId)
          return book && holder ? `${book.nome} (${holder.nome})` : account.nome
        },
        () => 'giocate',
      ),
    [buildBreakdown, visibleRows, allAccounts, allBooks, allHolders],
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

  const holderLabel = useCallback(
    (id: string | null) => (id ? (allHolders.find((h) => h.id === id)?.nome ?? '—') : '—'),
    [allHolders],
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

  // Le categorie delle giocate più quelle dei movimenti di wallet (slug del catalogo).
  const categoryOptions = useMemo(
    () => [
      ...PROFIT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
      ...movementCategories
        .filter((c) => c.natura !== 'capitale')
        .map((c) => ({ value: c.slug, label: c.nome })),
    ],
    [movementCategories],
  )

  const totalDetailPages = Math.max(1, Math.ceil(detailTotal / DETAIL_PAGE_SIZE))
  const periodoLabel =
    selectedMonth == null ? `Anno ${year}` : `${MONTH_LABELS_FULL[selectedMonth]} ${year}`
  const betsOnly = Boolean(accountId)

  return (
    <ProfitTrackerPageShell
      sectionTitle="Report"
      sectionDescription="Il conto economico: profitto delle giocate, costi dell'attività, altre entrate e spese, per periodo, identità e categoria"
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

      {betsOnly ? (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Con un conto selezionato il report mostra solo le giocate: i movimenti di wallet non hanno
          un conto.
        </p>
      ) : null}

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Netto {year}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold',
              (report?.netto ?? 0) >= 0 ? 'text-foreground' : 'text-destructive',
            )}
          >
            {isLoadingReport ? '—' : formatSignedCurrency(report?.netto ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Profitto giocate {year}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold',
              (report?.profittoGiocate ?? 0) >= 0 ? 'text-foreground' : 'text-destructive',
            )}
          >
            {isLoadingReport ? '—' : formatSignedCurrency(report?.profittoGiocate ?? 0)}
          </p>
          {!isLoadingReport ? (
            <p className="text-xs text-muted-foreground">{report?.giocate ?? 0} giocate</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Netto medio mensile</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {isLoadingReport ? '—' : formatSignedCurrency(kpi.media)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Miglior mese (netto)</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {isLoadingReport || !kpi.best ? '—' : `${MONTH_LABELS_FULL[kpi.best.month]}`}
          </p>
          {!isLoadingReport && kpi.best ? (
            <p className="text-xs text-muted-foreground">{formatSignedCurrency(kpi.best.netto)}</p>
          ) : null}
        </div>
      </div>

      {/* Conto economico (§14.111) */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Conto economico — {periodoLabel}</p>
        {isLoadingReport ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-2 divide-y divide-border/40">
            <StatementRow
              label="Profitto giocate"
              value={statement.profittoGiocate}
              sub={`${statement.giocate} ${statement.giocate === 1 ? 'giocata' : 'giocate'}`}
            />
            <StatementRow
              label="− Costi dell'attività"
              value={-statement.costiAttivita}
              details={statement.bySection.costo_attivita}
            />
            <StatementRow
              label="= Netto attività"
              value={statement.nettoAttivita}
              emphasis="total"
            />
            <StatementRow
              label="+ Altre entrate"
              value={statement.altreEntrate}
              details={statement.bySection.reddito}
            />
            <StatementRow
              label="− Spese personali"
              value={-statement.spesePersonali}
              details={statement.bySection.spesa_personale}
            />
            <StatementRow label="= Netto del periodo" value={statement.netto} emphasis="final" />
          </div>
        )}
        {!isLoadingReport && report && !betsOnly ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Fuori dal conto nel {year}: capitale versato {formatCurrency(report.capitaleVersato)} ·
            capitale ritirato {formatCurrency(report.capitaleRitirato)}
          </p>
        ) : null}
      </div>

      {/* Andamento mensile */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              {chartMode === 'netto' ? 'Netto mensile' : 'Profitto giocate mensile'} {year}
            </p>
            <p className="text-xs text-muted-foreground">
              Clicca su un mese per approfondire il dettaglio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-md border border-border p-0.5 text-xs"
              role="group"
              aria-label="Cosa mostra il grafico"
            >
              {(['netto', 'giocate'] as ChartMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={chartMode === mode}
                  className={cn(
                    'rounded px-2 py-1 font-medium',
                    chartMode === mode
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setChartMode(mode)}
                >
                  {mode === 'netto' ? 'Netto' : 'Solo giocate'}
                </button>
              ))}
            </div>
            {selectedMonth != null ? (
              <Button variant="outline" size="sm" onClick={() => setSelectedMonth(null)}>
                Mostra tutto l&apos;anno
              </Button>
            ) : null}
          </div>
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
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
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
                  content={<MonthTooltip mode={chartMode} />}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar
                  dataKey={chartMode === 'netto' ? 'netto' : 'profittoGiocate'}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  cursor="pointer"
                >
                  {chartData.map((entry) => {
                    const v = chartMode === 'netto' ? entry.netto : entry.profittoGiocate
                    return (
                      <Cell
                        key={entry.month}
                        fill={v >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                        opacity={selectedMonth == null || selectedMonth === entry.month ? 1 : 0.3}
                      />
                    )
                  })}
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
          emptyLabel="Nessuna voce nel periodo"
        />
        <BreakdownCard
          title={`Per identità (netto) — ${periodoLabel}`}
          rows={byHolder}
          emptyLabel="Nessuna voce nel periodo"
        />
        <BreakdownCard
          title={`Per conto (solo giocate) — ${periodoLabel}`}
          rows={byAccount}
          emptyLabel="Nessun profitto registrato nel periodo"
        />
      </div>

      {/* Dettaglio del periodo */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            Dettaglio del periodo — {periodoLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {detailTotal} {detailTotal === 1 ? 'voce' : 'voci'}
          </p>
        </div>
        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : detailItems.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessuna voce nel periodo selezionato.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 font-medium">Descrizione</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Conto / Collaboratore</th>
                  <th className="pb-2 text-right font-medium">Importo</th>
                </tr>
              </thead>
              <tbody>
                {detailItems.map((item) => (
                  <tr
                    key={`${item.kind}-${item.id}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                      {new Date(item.data).toLocaleDateString('it-IT')}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      <span
                        className={cn(
                          'inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium',
                          KIND_CLASS[item.kind],
                        )}
                      >
                        {KIND_LABELS[item.kind]}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-foreground">
                      {item.kind === 'quick' ? item.nome || 'Giocata rapida' : item.nome || '—'}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                      {rowCategoryLabel(item)}
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-muted-foreground">
                      {item.accountIds.length > 0
                        ? item.accountIds.map(accountLabel).join(', ')
                        : holderLabel(item.holderId)}
                    </td>
                    <td
                      className={cn(
                        'whitespace-nowrap py-2 text-right font-medium tabular-nums',
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

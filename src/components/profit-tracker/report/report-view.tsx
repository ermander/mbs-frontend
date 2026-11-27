'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Scale,
  Trophy,
  X,
} from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { OmDropdown, OmPagination, type OmOption } from '@/components/strumenti/scanner-v2/om-ds'
import { MonthBars } from '@/components/profit-tracker/dashboard/profit-month-chart'
import { GSelect } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { useAccountInfo } from '@/components/profit-tracker/giocate-rapide/use-account-info'
import {
  DS_CARD,
  DS_PANEL,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DS_TILE_GRID,
  DsAlert,
  DsAmount,
  DsPageHeader,
  DsSection,
  DsSegmented,
  DsStatTile,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { ReportMonthTable } from '@/components/profit-tracker/report/report-mesi'
import { ReportSaldi } from '@/components/profit-tracker/report/report-saldi'
import { ReportSezioni } from '@/components/profit-tracker/report/report-sezioni'
import { PROFIT_CATEGORIES } from '@/lib/profit-tracker/categories'
import { MONTH_FULL, dashMoney } from '@/lib/profit-tracker/dashboard'
import {
  BREAKDOWN_PAGE_SIZE,
  adjacentMonth,
  breakdownPage,
  breakdownShare,
  buildBreakdown,
  buildMonthTable,
  buildStatement,
  monthHasData,
  monthIndexOf,
  monthlyAverage,
  monthsOfYear,
  rowCategoryLabel,
  type BreakdownRow,
  type CategoryAmount,
  type MonthAmounts,
} from '@/lib/profit-tracker/report'
import { cn } from '@/lib/utils'
import { getProfitReport, getProfitReportDetail } from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type {
  ProfitReportDetailItem,
  ProfitReportDetailKind,
  ProfitReportResult,
} from '@/types/profit-tracker'

/**
 * Il Report del tracker sul design OddWise (§14.350): filtri, riquadri del periodo, conto
 * economico (§14.111), barre dei mesi con il mese da approfondire, suddivisioni e dettaglio delle
 * voci. Stesse letture e stessi conti della pagina di prima; il grafico è quello a barre della
 * Dashboard al posto di Recharts. Dal §14.389 le suddivisioni vanno a pagine.
 *
 * Analisi mese per mese: il mese si apre dal filtro «Mese», dalle barre o dalla tabella «Mese per
 * mese», e si scorre con le frecce; i riquadri passano al mese con il confronto col mese prima e
 * con la media. Un clic su una voce delle suddivisioni (identità, conto, categoria) la mette come
 * filtro, per seguire una sola identità mese per mese.
 *
 * §14.415: sotto i riquadri del periodo le sezioni (Matched Betting, Surebet, Valuebet,
 * Risultato + Goal) con gli obiettivi mensili, in report-sezioni.tsx.
 */

const DETAIL_PAGE_SIZE = 15

const KIND_LABEL: Record<ProfitReportDetailKind, string> = {
  bet: 'Giocata',
  quick: 'Rapida',
  ricarica: 'Ricarica',
  spesa: 'Spesa',
}
const KIND_TONE: Record<ProfitReportDetailKind, DsBadgeTone> = {
  bet: 'info',
  quick: 'brand',
  ricarica: 'profit',
  spesa: 'loss',
}

type ChartMode = 'netto' | 'giocate'

/** Gli anni del filtro: l'anno in corso e i quattro prima. */
const YEARS_BACK = 4

const money = (n: number) => dashMoney(n)
const UNIT_ONE: Record<BreakdownRow['unit'], string> = {
  giocate: 'giocata',
  movimenti: 'movimento',
  voci: 'voce',
}
const day = (iso: string) => new Date(iso).toLocaleDateString('it-IT')

export function ReportView() {
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const movementCategories = useProfitTrackerStore((s) => s.movementCategories)
  const fetchMovementCategories = useProfitTrackerStore((s) => s.fetchMovementCategories)
  const { accountInfo, accountOptions } = useAccountInfo()

  // L'istante della pagina: anno corrente e mese in corso restano fermi finché resta aperta.
  const [now] = useState(() => new Date())
  const currentYear = now.getFullYear()
  const [year, setYear] = useState(currentYear)
  const [holderId, setHolderId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [chartMode, setChartMode] = useState<ChartMode>('netto')

  const [report, setReport] = useState<ProfitReportResult | null>(null)
  const [detailItems, setDetailItems] = useState<ProfitReportDetailItem[]>([])
  const [detailTotal, setDetailTotal] = useState(0)

  useEffect(() => {
    void fetchMovementCategories()
  }, [fetchMovementCategories])

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

  // Caricamento ed errore sono derivati: il report in mano è «per» certi filtri, e finché non
  // sono quelli correnti si sta caricando (react-hooks/set-state-in-effect).
  const [reportState, setReportState] = useState<{
    filters: typeof baseFilters
    error: string | null
  } | null>(null)
  const isLoadingReport = reportState?.filters !== baseFilters
  const reportError = reportState?.filters === baseFilters ? reportState.error : null

  useEffect(() => {
    let cancelled = false
    getProfitReport(baseFilters)
      .then((result) => {
        if (cancelled) return
        setReport(result)
        setReportState({ filters: baseFilters, error: null })
      })
      .catch(() => {
        if (!cancelled)
          setReportState({
            filters: baseFilters,
            error: 'Non è stato possibile caricare il report. Riprova tra poco.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [baseFilters])

  // Il dettaglio segue anche il mese scelto sul grafico.
  const detailFilters = useMemo(() => {
    if (selectedMonth == null) return baseFilters
    return {
      ...baseFilters,
      fromDate: new Date(Date.UTC(year, selectedMonth, 1)).toISOString(),
      toDate: new Date(Date.UTC(year, selectedMonth + 1, 0, 23, 59, 59)).toISOString(),
    }
  }, [baseFilters, selectedMonth, year])

  // La pagina del dettaglio (da 0) vale per i filtri con cui è stata scelta: con altri filtri si
  // riparte dalla prima, senza un effetto che la azzeri.
  const [detailPageState, setDetailPageState] = useState<{
    filters: typeof detailFilters
    page: number
  } | null>(null)
  const detailPage = detailPageState?.filters === detailFilters ? detailPageState.page : 0
  const [detailLoaded, setDetailLoaded] = useState<{
    filters: typeof detailFilters
    page: number
  } | null>(null)
  const isLoadingDetail =
    detailLoaded == null ||
    detailLoaded.filters !== detailFilters ||
    detailLoaded.page !== detailPage

  useEffect(() => {
    let cancelled = false
    getProfitReportDetail({ ...detailFilters, page: detailPage + 1, limit: DETAIL_PAGE_SIZE })
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
        if (!cancelled) setDetailLoaded({ filters: detailFilters, page: detailPage })
      })
    return () => {
      cancelled = true
    }
  }, [detailFilters, detailPage])

  const months: MonthAmounts[] = useMemo(
    () => monthsOfYear(report?.buckets ?? [], year),
    [report, year],
  )

  // Nell'anno in corso i mesi che devono ancora iniziare restano vuoti, come nella Dashboard.
  const currentMonth = year === currentYear ? now.getMonth() : -1
  const series = useMemo(
    () =>
      months.map((m, i) =>
        currentMonth >= 0 && i > currentMonth
          ? null
          : chartMode === 'netto'
            ? m.netto
            : m.profittoGiocate,
      ),
    [months, chartMode, currentMonth],
  )

  // Suddivisioni e conto economico rispettano anche il mese scelto.
  const visibleRows = useMemo(() => {
    const rows = report?.rows ?? []
    if (selectedMonth == null) return rows
    return rows.filter((r) => {
      const { year: y, month } = monthIndexOf(r.periodStart)
      return y === year && month === selectedMonth
    })
  }, [report, selectedMonth, year])

  const statement = useMemo(() => buildStatement(visibleRows), [visibleRows])

  // §14.111: media e miglior mese sul netto del periodo.
  const kpi = useMemo(() => {
    const { media, mesi } = monthlyAverage(months)
    const best = months
      .map((m, i) => ({ ...m, i }))
      .filter(monthHasData)
      .reduce<(MonthAmounts & { i: number }) | null>(
        (acc, m) => (acc == null || m.netto > acc.netto ? m : acc),
        null,
      )
    return { media, best, monthsWithData: mesi }
  }, [months])

  // La tabella «Mese per mese»: fino al mese in corso nell'anno corrente, tutto l'anno prima.
  const monthTable = useMemo(
    () => buildMonthTable(months, currentMonth >= 0 ? currentMonth : 11),
    [months, currentMonth],
  )

  // Il confronto di gennaio va con il dicembre dell'anno prima, che il report dell'anno non ha: lo
  // legge a parte, con gli stessi filtri, solo quando gennaio è aperto.
  const prevDecemberFilters = useMemo(
    () =>
      selectedMonth === 0
        ? {
            ...baseFilters,
            fromDate: new Date(Date.UTC(year - 1, 11, 1)).toISOString(),
            toDate: new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59)).toISOString(),
          }
        : null,
    [baseFilters, selectedMonth, year],
  )
  const [prevDecember, setPrevDecember] = useState<{
    filters: NonNullable<typeof prevDecemberFilters>
    netto: number | null
  } | null>(null)
  useEffect(() => {
    if (!prevDecemberFilters) return
    let cancelled = false
    getProfitReport(prevDecemberFilters)
      .then((r) => {
        if (!cancelled) setPrevDecember({ filters: prevDecemberFilters, netto: r.netto })
      })
      .catch(() => {
        if (!cancelled) setPrevDecember({ filters: prevDecemberFilters, netto: null })
      })
    return () => {
      cancelled = true
    }
  }, [prevDecemberFilters])

  // Il mese aperto: le sue voci, il mese prima (null se non letto) e lo scarto dalla media.
  const monthView = useMemo(() => {
    if (selectedMonth == null) return null
    const m = months[selectedMonth]
    const prevMonth = (selectedMonth + 11) % 12
    let prevNetto: number | null
    let prevLoading = false
    if (selectedMonth > 0) {
      prevNetto = months[prevMonth].netto
    } else if (prevDecember?.filters === prevDecemberFilters) {
      prevNetto = prevDecember?.netto ?? null
    } else {
      prevNetto = null
      prevLoading = true
    }
    return { ...m, prevMonth, prevNetto, prevLoading }
  }, [selectedMonth, months, prevDecember, prevDecemberFilters])

  const holderName = (id: string | null) =>
    id ? (allHolders.find((h) => h.id === id)?.nome ?? 'Sconosciuto') : '—'

  const byCategoria = useMemo(
    () =>
      buildBreakdown(
        visibleRows,
        (r) => r.categoria,
        (_key, r) => rowCategoryLabel(r),
        (r) => (r.sezione === 'giocate' ? 'giocate' : 'movimenti'),
      ),
    [visibleRows],
  )

  // Per identità: il netto del collaboratore, con sotto le sue componenti.
  const byHolder = useMemo(
    () =>
      buildBreakdown(
        visibleRows,
        (r) => r.holderId,
        (id) => allHolders.find((h) => h.id === id)?.nome ?? 'Sconosciuto',
        () => 'voci',
      ).map((row) => {
        const st = buildStatement(visibleRows.filter((r) => r.holderId === row.key))
        const parts: string[] = []
        if (st.giocate > 0) parts.push(`giocate ${money(st.profittoGiocate)}`)
        if (st.costiAttivita !== 0) parts.push(`costi ${money(-st.costiAttivita)}`)
        if (st.altreEntrate !== 0) parts.push(`entrate ${money(st.altreEntrate)}`)
        if (st.spesePersonali !== 0) parts.push(`spese ${money(-st.spesePersonali)}`)
        return { ...row, note: parts.join(' · ') }
      }),
    [visibleRows, allHolders],
  )

  const byAccount = useMemo(
    () =>
      buildBreakdown(
        visibleRows.filter((r) => r.accountId !== null),
        (r) => r.accountId ?? '',
        (id) => accountInfo(id).label,
        () => 'giocate',
      ),
    [visibleRows, accountInfo],
  )

  const yearOptions = Array.from({ length: YEARS_BACK + 1 }, (_, i) => currentYear - i).map(
    (y) => ({
      value: String(y),
      label: String(y),
    }),
  )
  // Nell'anno in corso i mesi che devono ancora iniziare non si possono aprire.
  const monthOptions = [
    { value: '', label: "Tutto l'anno" },
    ...MONTH_FULL.map((name, i) => ({
      value: String(i),
      label: name,
      disabled: currentMonth >= 0 && i > currentMonth,
    })),
  ]
  const monthLimits = { minYear: currentYear - YEARS_BACK, now }
  const goToMonth = (target: { year: number; month: number } | null) => {
    if (!target) return
    setYear(target.year)
    setSelectedMonth(target.month)
  }
  const prevTarget =
    selectedMonth == null ? null : adjacentMonth(year, selectedMonth, -1, monthLimits)
  const nextTarget =
    selectedMonth == null ? null : adjacentMonth(year, selectedMonth, 1, monthLimits)
  const toggleMonth = (m: number) => setSelectedMonth((prev) => (prev === m ? null : m))
  const holderOptions: OmOption[] = useMemo(
    () =>
      allHolders
        .map((h) => ({ value: h.id, label: h.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [allHolders],
  )
  // Le categorie delle giocate più quelle dei movimenti di wallet (slug del catalogo).
  const categoryOptions: OmOption[] = useMemo(
    () => [
      ...PROFIT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
      ...movementCategories
        .filter((c) => c.natura !== 'capitale')
        .map((c) => ({ value: c.slug, label: c.nome })),
    ],
    [movementCategories],
  )

  const periodo = selectedMonth == null ? `Anno ${year}` : `${MONTH_FULL[selectedMonth]} ${year}`
  const betsOnly = Boolean(accountId)
  const hasFilters = Boolean(holderId || accountId || categoria)

  const barTitle = (i: number, v: number | null) => {
    if (v === null) return `${MONTH_FULL[i]} ${year}: mese non ancora iniziato`
    const m = months[i]
    return [
      `${MONTH_FULL[i]} ${year}: ${chartMode === 'netto' ? 'netto' : 'giocate'} ${money(v)}`,
      `giocate ${money(m.profittoGiocate)} (${m.giocate})`,
      `costi attività ${money(-m.costiAttivita)}`,
      `altre entrate ${money(m.altreEntrate)}`,
      `spese personali ${money(-m.spesePersonali)}`,
    ].join(' · ')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <DsPageHeader
          title="Report"
          description="I saldi di oggi e il conto economico del tracker: profitto delle giocate, costi dell’attività, altre entrate e spese, per periodo, identità e categoria."
        />

        <div className="mb-3">
          <ReportSaldi />
        </div>

        <div className={cn(DS_PANEL, 'grid grid-cols-2 gap-4 px-6 py-5 lg:grid-cols-5')}>
          <GSelect
            id="report-anno"
            label="Anno"
            size="sm"
            options={yearOptions}
            value={String(year)}
            onChange={(v) => {
              setYear(Number(v))
              setSelectedMonth(null)
            }}
          />
          <GSelect
            id="report-mese"
            label="Mese"
            size="sm"
            options={monthOptions}
            value={selectedMonth == null ? '' : String(selectedMonth)}
            onChange={(v) => setSelectedMonth(v === '' ? null : Number(v))}
          />
          <OmDropdown
            id="report-identita"
            className="col-span-2 lg:col-span-1"
            label="Identità"
            allLabel="Tutte le identità"
            single
            size="sm"
            emptyText="Nessuna identità con questo nome."
            options={holderOptions}
            selected={holderId ? [holderId] : []}
            onChange={(next) => setHolderId(next[0] ?? '')}
          />
          <OmDropdown
            id="report-conto"
            className="col-span-2 lg:col-span-1"
            label="Conto scommesse"
            allLabel="Tutti i conti"
            single
            size="sm"
            panelWidth={300}
            emptyText="Nessun conto con questo nome."
            options={accountOptions}
            selected={accountId ? [accountId] : []}
            onChange={(next) => setAccountId(next[0] ?? '')}
          />
          <OmDropdown
            id="report-categoria"
            className="col-span-2 lg:col-span-1"
            label="Categoria"
            allLabel="Tutte le categorie"
            single
            size="sm"
            emptyText="Nessuna categoria con questo nome."
            options={categoryOptions}
            selected={categoria ? [categoria] : []}
            onChange={(next) => setCategoria(next[0] ?? '')}
          />
        </div>

        {(hasFilters || selectedMonth != null) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="ds-label text-ds-ink-muted uppercase">Filtri attivi</span>
            {selectedMonth != null && (
              <FilterChip
                label={`Mese: ${MONTH_FULL[selectedMonth]}`}
                onClear={() => setSelectedMonth(null)}
              />
            )}
            {holderId && (
              <FilterChip
                label={`Identità: ${holderName(holderId)}`}
                onClear={() => setHolderId('')}
              />
            )}
            {accountId && (
              <FilterChip
                label={`Conto: ${accountInfo(accountId).label}`}
                onClear={() => setAccountId('')}
              />
            )}
            {categoria && (
              <FilterChip
                label={`Categoria: ${categoryOptions.find((c) => c.value === categoria)?.label ?? categoria}`}
                onClear={() => setCategoria('')}
              />
            )}
          </div>
        )}

        {reportError && <DsAlert>{reportError}</DsAlert>}
        {betsOnly && (
          <DsAlert tone="info">
            Con un conto scelto il report mostra solo le giocate: i movimenti dei wallet non hanno
            un conto.
          </DsAlert>
        )}
      </div>

      <section aria-labelledby="h-report-periodo" className="flex flex-col gap-3">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="h-report-periodo" className="ds-label m-0 text-ds-ink-muted uppercase">
            {periodo}
          </h2>
          {selectedMonth != null && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!prevTarget}
                onClick={() => goToMonth(prevTarget)}
                className={cn(dsButtonClass('secondary', 'sm'), 'gap-1')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {prevTarget ? MONTH_FULL[prevTarget.month] : 'Mese prima'}
              </button>
              <button
                type="button"
                disabled={!nextTarget}
                onClick={() => goToMonth(nextTarget)}
                className={cn(dsButtonClass('secondary', 'sm'), 'gap-1')}
              >
                {nextTarget ? MONTH_FULL[nextTarget.month] : 'Mese dopo'}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className={dsButtonClass('ghost', 'sm')}
              >
                Tutto l&apos;anno
              </button>
            </div>
          )}
        </div>
        {monthView && selectedMonth != null ? (
          <div className={DS_TILE_GRID}>
            <DsStatTile
              label={`Netto di ${MONTH_FULL[selectedMonth].toLowerCase()}`}
              value={monthView.netto}
              note="Giocate, meno costi, più entrate, meno spese"
              icon={Scale}
              signed
              isLoading={isLoadingReport}
            />
            <DsStatTile
              label={`Profitto giocate di ${MONTH_FULL[selectedMonth].toLowerCase()}`}
              value={monthView.profittoGiocate}
              note={isLoadingReport ? ' ' : countLabel(monthView.giocate, 'giocata', 'giocate')}
              icon={ListChecks}
              signed
              isLoading={isLoadingReport}
            />
            <DsStatTile
              label={`Rispetto a ${MONTH_FULL[monthView.prevMonth].toLowerCase()}${selectedMonth === 0 ? ` ${year - 1}` : ''}`}
              value={monthView.prevNetto == null ? 0 : monthView.netto - monthView.prevNetto}
              text={monthView.prevNetto == null ? '—' : undefined}
              note={
                monthView.prevNetto == null
                  ? 'Netto del mese prima non disponibile'
                  : `Netto del mese prima: ${money(monthView.prevNetto)}`
              }
              icon={ArrowLeftRight}
              signed
              isLoading={isLoadingReport || monthView.prevLoading}
            />
            <DsStatTile
              label={`Rispetto alla media del ${year}`}
              value={monthView.netto - kpi.media}
              note={
                kpi.monthsWithData > 0
                  ? `Media mensile: ${money(kpi.media)}`
                  : 'Nessun mese con voci'
              }
              icon={Calculator}
              signed
              isLoading={isLoadingReport}
            />
          </div>
        ) : (
          <div className={DS_TILE_GRID}>
            <DsStatTile
              label={`Netto ${year}`}
              value={report?.netto ?? 0}
              note="Giocate, meno costi, più entrate, meno spese"
              icon={Scale}
              signed
              isLoading={isLoadingReport}
            />
            <DsStatTile
              label={`Profitto giocate ${year}`}
              value={report?.profittoGiocate ?? 0}
              note={
                isLoadingReport
                  ? ' '
                  : `${report?.giocate ?? 0} ${report?.giocate === 1 ? 'giocata' : 'giocate'}`
              }
              icon={ListChecks}
              signed
              isLoading={isLoadingReport}
            />
            <DsStatTile
              label="Netto medio mensile"
              value={kpi.media}
              note={
                kpi.monthsWithData > 0
                  ? `Su ${kpi.monthsWithData} ${kpi.monthsWithData === 1 ? 'mese' : 'mesi'} con voci`
                  : 'Nessun mese con voci'
              }
              icon={Calculator}
              signed
              isLoading={isLoadingReport}
            />
            <DsStatTile
              label="Miglior mese (netto)"
              value={kpi.best?.netto ?? 0}
              text={kpi.best ? MONTH_FULL[kpi.best.i] : '—'}
              note={kpi.best ? money(kpi.best.netto) : 'Nessun mese con voci'}
              icon={Trophy}
              isLoading={isLoadingReport}
            />
          </div>
        )}
      </section>

      <ReportSezioni
        report={reportState?.filters === baseFilters ? report : null}
        isLoading={isLoadingReport}
        year={year}
        selectedMonth={selectedMonth}
        now={now}
        categoria={categoria}
        goalsHidden={Boolean(holderId || accountId)}
        onSelectCategoria={(key) => setCategoria((prev) => (prev === key ? '' : key))}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={cn(DS_PANEL, 'flex min-w-0 flex-col gap-6 px-4 pt-5 pb-6 sm:px-6')}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="ds-heading m-0">
                {chartMode === 'netto'
                  ? 'Netto mese per mese'
                  : 'Profitto delle giocate mese per mese'}
              </h2>
              <p className="ds-body-sm m-0 text-ds-ink-muted">
                Clicca un mese per aprirlo: riquadri, conto economico, suddivisioni e dettaglio
                mostrano solo quello.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DsSegmented
                label="Cosa mostra il grafico"
                items={[
                  { value: 'netto', label: 'Netto' },
                  { value: 'giocate', label: 'Solo giocate' },
                ]}
                value={chartMode}
                onChange={setChartMode}
              />
            </div>
          </div>
          {isLoadingReport ? (
            <div
              aria-busy="true"
              aria-label="Caricamento del grafico"
              className="h-[268px] animate-pulse rounded-ds-sm bg-ds-surface-sunken"
            />
          ) : (
            <MonthBars
              series={series}
              currentMonth={currentMonth}
              barTitle={barTitle}
              label={`Grafico a barre del ${chartMode === 'netto' ? 'netto' : 'profitto delle giocate'} del ${year}`}
              selectedMonth={selectedMonth}
              onSelect={toggleMonth}
            />
          )}
        </div>

        <section
          aria-labelledby="h-conto-economico"
          className={cn(DS_PANEL, 'flex flex-col gap-1 p-5')}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="h-conto-economico" className="ds-heading m-0">
              Conto economico
            </h2>
            <span className="ds-caption text-ds-ink-muted">{periodo}</span>
          </div>
          {isLoadingReport ? (
            <div
              aria-busy="true"
              className="mt-3 h-64 animate-pulse rounded-ds-sm bg-ds-surface-sunken"
            />
          ) : (
            <div className="mt-2 flex flex-col">
              <StatementLine
                label="Profitto giocate"
                value={statement.profittoGiocate}
                sub={`${statement.giocate} ${statement.giocate === 1 ? 'giocata' : 'giocate'}`}
              />
              <StatementLine
                label="− Costi dell’attività"
                value={-statement.costiAttivita}
                details={statement.bySection.costo_attivita}
              />
              <StatementLine
                label="= Netto attività"
                value={statement.nettoAttivita}
                emphasis="total"
              />
              <StatementLine
                label="+ Altre entrate"
                value={statement.altreEntrate}
                details={statement.bySection.reddito}
              />
              <StatementLine
                label="− Spese personali"
                value={-statement.spesePersonali}
                details={statement.bySection.spesa_personale}
              />
              <StatementLine label="= Netto del periodo" value={statement.netto} emphasis="final" />
            </div>
          )}
          {!isLoadingReport && report && !betsOnly && (
            <p className="ds-caption m-0 mt-2 text-ds-ink-muted">
              Fuori dal conto nel {year}: capitale versato{' '}
              {dashMoney(report.capitaleVersato, { sign: false })} · capitale ritirato{' '}
              {dashMoney(report.capitaleRitirato, { sign: false })}
            </p>
          )}
        </section>
      </div>

      <DsSection id="h-mese-per-mese" title={`Mese per mese · ${year}`}>
        <ReportMonthTable
          year={year}
          rows={monthTable}
          selectedMonth={selectedMonth}
          onSelect={toggleMonth}
          betsOnly={betsOnly}
          isLoading={isLoadingReport}
        />
      </DsSection>

      <DsSection id="h-suddivisioni" title={`Suddivisioni · ${periodo}`}>
        <p className="ds-body-sm m-0 -mt-1 text-ds-ink-muted">
          Clicca un&apos;identità, un conto o una categoria per filtrare tutto il report su quella
          voce, anche mese per mese.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <BreakdownCard
            title="Per categoria"
            rows={byCategoria}
            emptyLabel="Nessuna voce nel periodo."
            unit={['categoria', 'categorie']}
            selectedKey={categoria}
            onSelect={(key) => setCategoria((prev) => (prev === key ? '' : key))}
          />
          <BreakdownCard
            title="Per identità (netto)"
            rows={byHolder}
            emptyLabel="Nessuna voce nel periodo."
            unit={['identità', 'identità']}
            selectedKey={holderId}
            onSelect={(key) => setHolderId((prev) => (prev === key ? '' : key))}
          />
          <BreakdownCard
            title="Per conto (solo giocate)"
            rows={byAccount}
            emptyLabel="Nessun profitto registrato nel periodo."
            unit={['conto', 'conti']}
            selectedKey={accountId}
            onSelect={(key) => setAccountId((prev) => (prev === key ? '' : key))}
          />
        </div>
      </DsSection>

      <DsSection id="h-dettaglio" title={`Dettaglio · ${periodo}`}>
        {isLoadingDetail && detailItems.length === 0 ? (
          <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento delle voci…</p>
        ) : detailTotal === 0 && !isLoadingDetail ? (
          <div className={cn(DS_PANEL, 'flex flex-col items-center gap-2 px-6 py-10 text-center')}>
            <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted">
              <BarChart3 className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className="ds-heading m-0">Nessuna voce nel periodo</h3>
            <p className="ds-body m-0 max-w-[440px] text-ds-ink-muted">
              Le giocate archiviate, le rapide, le ricariche e le spese del periodo compaiono qui.
            </p>
          </div>
        ) : (
          <div className={cn('flex flex-col gap-3', isLoadingDetail && 'opacity-60')}>
            <div className={DS_TABLE_WRAP}>
              <table className="w-full border-collapse">
                <caption className="sr-only">Voci del periodo, dalla più recente</caption>
                <thead>
                  <tr className={DS_THEAD_ROW}>
                    <th scope="col" className="w-[104px] py-3 pr-2.5 pl-4">
                      Data
                    </th>
                    <th scope="col" className="w-[96px] px-2.5 py-3">
                      Tipo
                    </th>
                    <th scope="col" className="min-w-[200px] px-2.5 py-3">
                      Descrizione
                    </th>
                    <th scope="col" className="w-[150px] px-2.5 py-3">
                      Categoria
                    </th>
                    <th scope="col" className="min-w-[180px] px-2.5 py-3">
                      Conto / collaboratore
                    </th>
                    <th scope="col" className="w-[120px] py-3 pr-4 pl-2.5 text-right">
                      Importo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((item) => (
                    <tr key={`${item.kind}-${item.id}`} className={DS_ROW}>
                      <td className="ds-num-sm py-3 pr-2.5 pl-4 whitespace-nowrap">
                        {day(item.data)}
                      </td>
                      <td className="px-2.5 py-3">
                        <DsBadge tone={KIND_TONE[item.kind]}>{KIND_LABEL[item.kind]}</DsBadge>
                      </td>
                      <td className="max-w-[260px] px-2.5 py-3">
                        <span className="block truncate font-semibold text-ds-ink">
                          {itemName(item)}
                        </span>
                      </td>
                      <td className="ds-body-sm px-2.5 py-3 text-ds-ink-muted">
                        {rowCategoryLabel(item)}
                      </td>
                      <td className="ds-body-sm max-w-[240px] px-2.5 py-3 text-ds-ink-muted">
                        <span className="block truncate">{itemWho(item)}</span>
                      </td>
                      <td className="py-3 pr-4 pl-2.5 text-right">
                        <DsAmount value={item.importo} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
              {detailItems.map((item) => (
                <li key={`${item.kind}-${item.id}`} className={DS_CARD}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold text-pretty text-ds-ink">
                        {itemName(item)}
                      </span>
                      <span className="ds-caption text-ds-ink-muted">
                        {day(item.data)} · {rowCategoryLabel(item)}
                      </span>
                    </div>
                    <DsAmount value={item.importo} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <DsBadge tone={KIND_TONE[item.kind]}>{KIND_LABEL[item.kind]}</DsBadge>
                    <span className="ds-caption text-right text-ds-ink-muted">{itemWho(item)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {detailTotal > DETAIL_PAGE_SIZE && (
              <OmPagination
                page={detailPage}
                pageSize={DETAIL_PAGE_SIZE}
                total={detailTotal}
                unit={detailTotal === 1 ? 'voce' : 'voci'}
                onChange={(p) => setDetailPageState({ filters: detailFilters, page: p })}
              />
            )}
          </div>
        )}
      </DsSection>
    </div>
  )

  function itemName(item: ProfitReportDetailItem) {
    return item.kind === 'quick' ? item.nome || 'Giocata rapida' : item.nome || '—'
  }

  function itemWho(item: ProfitReportDetailItem) {
    return item.accountIds.length > 0
      ? item.accountIds.map((id) => accountInfo(id).label).join(', ')
      : holderName(item.holderId)
  }
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Togli il filtro ${label}`}
      onClick={onClear}
      className={dsButtonClass('ghost', 'sm')}
    >
      {label}
      <X className="h-4 w-4" aria-hidden />
    </button>
  )
}

/** Una riga del conto economico: voce, importo con segno e colore, dettaglio delle categorie. */
function StatementLine({
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
        'flex flex-col gap-0.5 py-2.5',
        emphasis === 'total' && 'border-t border-ds-line',
        emphasis === 'final' && 'mt-1 border-t-2 border-ds-line-strong pt-3',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            'ds-body text-ds-ink',
            emphasis && 'font-semibold',
            emphasis === 'final' && 'text-[17px]',
          )}
        >
          {label}
          {sub && <span className="ds-caption ml-2 font-normal text-ds-ink-muted">{sub}</span>}
        </span>
        <DsAmount value={value} size={emphasis === 'final' ? 'lg' : 'sm'} />
      </div>
      {details && details.length > 0 && (
        <p className="ds-caption m-0 text-ds-ink-muted">
          {details.map((d) => `${d.label} ${dashMoney(d.totale)}`).join(' · ')}
        </p>
      )}
    </div>
  )
}

/**
 * Una suddivisione: voce, importo, barra in proporzione alla voce più grande, conteggio e quota.
 * Dal §14.389 a pagine di BREAKDOWN_PAGE_SIZE voci: barre e quote restano sul totale di tutte le
 * voci, e l'ultima pagina tiene l'altezza delle altre perché le frecce non si spostino.
 * Con `onSelect` il nome della voce è un pulsante che la mette come filtro (o lo toglie).
 */
function BreakdownCard({
  title,
  rows,
  emptyLabel,
  unit,
  selectedKey,
  onSelect,
}: {
  title: string
  rows: BreakdownRow[]
  emptyLabel: string
  /** Come si contano le voci nel piede: singolare e plurale. */
  unit: [string, string]
  selectedKey?: string
  onSelect?: (key: string) => void
}) {
  // La pagina vale per le voci con cui è stata scelta: con un altro mese o altri filtri si
  // riparte dalla prima, senza un effetto che la azzeri.
  const [pageState, setPageState] = useState<{ rows: BreakdownRow[]; page: number } | null>(null)
  const { page, items, filler } = breakdownPage(rows, pageState?.rows === rows ? pageState.page : 0)
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.totale)), 1)
  const withNote = rows.some((r) => r.note)
  return (
    <div className={cn(DS_PANEL, 'flex min-w-0 flex-col gap-3 p-5')}>
      <h3 className="ds-heading m-0 text-lg leading-6">{title}</h3>
      {rows.length === 0 ? (
        <p className="ds-body-sm m-0 text-ds-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((row) => (
            <BreakdownItem
              key={row.key}
              row={row}
              share={breakdownShare(row, rows)}
              maxAbs={maxAbs}
              selected={selectedKey === row.key}
              onSelect={onSelect}
            />
          ))}
          {Array.from({ length: filler }, (_, i) => (
            <BreakdownItem
              key={`vuota-${i}`}
              row={{
                key: `vuota-${i}`,
                label: '\u00a0',
                totale: 0,
                count: 0,
                unit: 'voci',
                note: withNote ? '\u00a0' : undefined,
              }}
              share={null}
              maxAbs={maxAbs}
              placeholder
            />
          ))}
        </ul>
      )}
      {rows.length > BREAKDOWN_PAGE_SIZE && (
        <div className="mt-auto">
          <OmPagination
            compact
            label={`Pagine della suddivisione ${title}`}
            page={page}
            pageSize={BREAKDOWN_PAGE_SIZE}
            total={rows.length}
            unit={rows.length === 1 ? unit[0] : unit[1]}
            onChange={(p) => setPageState({ rows, page: p })}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Una voce della suddivisione; `placeholder` è la riga vuota che tiene l'altezza della pagina. Con
 * `onSelect` (mai sulle righe vuote) il nome è un pulsante che mette la voce come filtro.
 */
function BreakdownItem({
  row,
  share,
  maxAbs,
  placeholder,
  selected,
  onSelect,
}: {
  row: BreakdownRow
  share: number | null
  maxAbs: number
  placeholder?: boolean
  selected?: boolean
  onSelect?: (key: string) => void
}) {
  return (
    <li
      aria-hidden={placeholder || undefined}
      className={cn('flex flex-col gap-1', placeholder && 'invisible')}
    >
      <div className="flex items-baseline justify-between gap-2">
        {onSelect && !placeholder ? (
          <button
            type="button"
            aria-pressed={selected}
            title={selected ? `Togli il filtro ${row.label}` : `Filtra il report per ${row.label}`}
            onClick={() => onSelect(row.key)}
            className={cn(
              'ds-body-sm min-w-0 cursor-pointer truncate rounded-ds-xs text-left underline-offset-2 hover:text-ds-brand hover:underline',
              selected ? 'font-semibold text-ds-brand' : 'text-ds-ink',
              dsFocusRing,
            )}
          >
            {row.label}
          </button>
        ) : (
          <span
            className="ds-body-sm truncate text-ds-ink"
            title={placeholder ? undefined : row.label}
          >
            {row.label}
          </span>
        )}
        <DsAmount value={row.totale} size="sm" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ds-surface-sunken">
          <div
            className={cn('h-full rounded-full', row.totale >= 0 ? 'bg-ds-brand' : 'bg-ds-loss')}
            style={{ width: `${(Math.abs(row.totale) / maxAbs) * 100}%` }}
          />
        </div>
        <span className="ds-caption w-28 shrink-0 text-right text-ds-ink-muted tabular-nums">
          {countLabel(row.count, UNIT_ONE[row.unit], row.unit)}
          {share != null ? ` · ${share.toFixed(0)} %` : ''}
        </span>
      </div>
      {row.note && (
        <p
          className="ds-caption m-0 truncate text-ds-ink-muted"
          title={placeholder ? undefined : row.note}
        >
          {row.note}
        </p>
      )}
    </li>
  )
}

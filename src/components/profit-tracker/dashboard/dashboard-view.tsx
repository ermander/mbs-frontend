'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  Clock,
  Euro,
  ListChecks,
  Lock,
  RefreshCw,
  Scale,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { ProfitMonthChart } from '@/components/profit-tracker/dashboard/profit-month-chart'
import {
  dashMoney,
  dashboardBalances,
  dashboardProfit,
  monthlySeries,
} from '@/lib/profit-tracker/dashboard'
import { cn } from '@/lib/utils'
import {
  getPuntateInCorsoTotale,
  getUnifiedProfitSummary,
} from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { BetLegRealizedLedgerSummaryResult } from '@/types/profit-tracker'

/**
 * StatTile del design OddWise con l'icona nel cerchio brand-soft in alto a destra: etichetta,
 * importo da 32px (neutro per i saldi, con segno e colore per i profitti), nota sotto.
 */
function DashStatTile({
  label,
  value,
  note,
  icon: Icon,
  signed,
  isLoading,
}: {
  label: string
  value: number
  note: string
  icon: LucideIcon
  signed?: boolean
  isLoading?: boolean
}) {
  const tone = !signed ? '' : value > 0 ? 'text-ds-profit' : value < 0 ? 'text-ds-loss' : ''
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 rounded-ds-md border border-ds-line bg-ds-surface-raised py-5 pr-[72px] pl-6 shadow-ds-sm">
      <span className="font-ds-sans text-xs leading-4 font-medium tracking-[0.02em] text-ds-ink-muted">
        {label}
      </span>
      {isLoading ? (
        <span
          aria-hidden
          className="my-0.5 block h-8 w-40 max-w-full animate-pulse rounded-ds-xs bg-ds-surface-sunken"
        />
      ) : (
        <span
          className={cn(
            'font-ds-sans text-[32px] leading-9 font-semibold tracking-[-0.01em] whitespace-nowrap tabular-nums',
            tone,
          )}
        >
          {dashMoney(value, { sign: !!signed })}
        </span>
      )}
      <span className="mt-0.5 font-ds-sans text-sm leading-5 text-ds-ink-muted">{note}</span>
      <span
        aria-hidden
        className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand"
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="ds-label m-0 text-ds-ink-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

const TILE_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4'

/** La Dashboard del tracker dal design OddWise (§14.336): saldi, profitto dell'anno e grafico. */
export function DashboardView() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)

  // L'istante della pagina: anno, mese in corso e «al 4 novembre» restano fermi finché resta aperta.
  const [now] = useState(() => new Date())
  const year = now.getFullYear()

  const [summary, setSummary] = useState<BetLegRealizedLedgerSummaryResult | null>(null)
  const [puntateInCorso, setPuntateInCorso] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
    Promise.all([
      getUnifiedProfitSummary({
        granularity: 'month',
        fromDate: `${year}-01-01T00:00:00Z`,
        toDate: `${year}-12-31T23:59:59Z`,
      }),
      getPuntateInCorsoTotale(),
    ])
      .then(([s, p]) => {
        setSummary(s)
        setPuntateInCorso(p.totale)
      })
      .catch((err) => {
        console.error('Dashboard data fetch error:', err)
        setLoadError(
          'Non è stato possibile caricare il profitto e le puntate in corso. Ricarica la pagina.',
        )
      })
      .finally(() => setIsLoading(false))
  }, [fetchAllAccounts, fetchWallets, year])

  const saldi = useMemo(
    () => dashboardBalances(allAccounts, wallets, puntateInCorso),
    [allAccounts, wallets, puntateInCorso],
  )
  const series = useMemo(
    () => monthlySeries(summary?.buckets ?? [], year, now),
    [summary, year, now],
  )
  const profit = useMemo(
    () => dashboardProfit(series, summary?.rangeTotal ?? 0, year, now),
    [series, summary, year, now],
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="ds-title m-0 -mb-2">Dashboard</h1>

      {loadError && (
        <p
          role="alert"
          className="ds-body-sm m-0 rounded-ds-sm bg-ds-loss-soft px-3 py-2 text-ds-loss"
        >
          {loadError}
        </p>
      )}

      <Section id="h-saldi" title="Saldi">
        <div className={TILE_GRID}>
          <DashStatTile
            label="Saldo totale"
            value={saldi.saldoTotale}
            note="Bookmaker, wallet, prelievi in attesa e puntate in corso"
            icon={Euro}
            isLoading={isLoading}
          />
          <DashStatTile
            label="Saldo bookmaker"
            value={saldi.saldoBookmakers}
            note={saldi.bookNote}
            icon={Scale}
          />
          <DashStatTile
            label="Saldo wallet"
            value={saldi.saldoWallets}
            note={saldi.walletNote}
            icon={Wallet}
          />
          <DashStatTile
            label="Prelievi in attesa"
            value={saldi.prelieviInAttesa}
            note="Usciti dai conti, non ancora sui wallet"
            icon={Clock}
          />
          <DashStatTile
            label="Saldo bloccato"
            value={saldi.saldoBloccato}
            note={saldi.bloccatoNote}
            icon={Lock}
          />
          <DashStatTile
            label="Puntate in corso"
            value={saldi.puntateInCorso}
            note="Importi ancora sulle giocate aperte"
            icon={RefreshCw}
            isLoading={isLoading}
          />
        </div>
      </Section>

      <Section id="h-profitto" title={`Profitto ${year}`}>
        <div className={TILE_GRID}>
          <DashStatTile
            label="Mese attuale"
            value={profit.meseAttuale}
            note={profit.meseNote}
            icon={TrendingUp}
            signed
            isLoading={isLoading}
          />
          <DashStatTile
            label="Media mensile"
            value={profit.mediaMensile}
            note={profit.mediaNote}
            icon={Calculator}
            signed
            isLoading={isLoading}
          />
          <DashStatTile
            label="Totale anno"
            value={profit.totaleAnno}
            note={profit.annoNote}
            icon={ListChecks}
            signed
            isLoading={isLoading}
          />
        </div>

        <ProfitMonthChart
          year={year}
          series={series}
          currentMonth={now.getMonth()}
          isLoading={isLoading}
          isEmpty={!loadError && profit.isEmpty}
        />
      </Section>
    </div>
  )
}
